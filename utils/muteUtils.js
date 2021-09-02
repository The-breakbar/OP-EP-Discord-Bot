const redis = require("./redisClient");

module.exports = {
	async mute(member, time) {
		let endTime = Date.now() + time;

		// Add mute in database
		await redis.set(member.user.id, endTime);

		// Add muted role
		let mutedMember = member;
		if (!mutedMember.roles.cache.some((role) => role.name == "Muted")) {
			mutedMember = await member.roles.add(member.guild.roles.cache.find((role) => role.name == "Muted"));
		}

		// Set unmute timeout
		unmuteTimeout(mutedMember, endTime, time);
	},

	// On bot restart, reinitialize unmutes for muted users
	async syncMuted(client) {
		const now = Date.now();

		// Fetch all currently muted users
		const mutedMembers = await client.wikiServer.guild.members.fetch().then((allMembers) => {
			return allMembers.filter((member) => member.roles.cache.some((role) => role.name == "Muted"));
		});

		// Get all mute entries from database
		let mutedIds = await redis.keys("[0-9]*");
		let muteTimes;
		if (mutedIds.length > 1) muteTimes = await redis.mget(mutedIds);
		else if (mutedIds.length == 1) muteTimes = [await redis.get(mutedIds[0])];

		if (muteTimes) {
			// Unmute those that are not in db
			mutedMembers.forEach((mutedMember) => {
				if (!mutedIds.includes(mutedMember.id)) {
					unmute(mutedMember);
				}
			});

			// Set unmute time for each database entry if user is muted
			mutedIds.forEach((id, index) => {
				const mutedMember = mutedMembers.get(id);
				const mutedId = id;
				const endTime = muteTimes[index];
				if (mutedMember) {
					// If mute is already over, unmute immediately
					if (now > endTime) {
						// Remove mute
						redis.del(mutedId);
						unmute(mutedMember);
					} else {
						// Set unmute timeout
						unmuteTimeout(mutedMember, endTime, endTime - now);
					}
				} else {
					// If user isn't muted check if they're in the server
					client.wikiServer.guild.members.fetch(mutedId).then((notMutedMember) => {
						if (notMutedMember) {
							notMutedMember.roles.add(notMutedMember.guild.roles.cache.find((role) => role.name == "Muted")).then((nowMutedMember) => {
								unmuteTimeout(nowMutedMember, endTime, endTime - now);
							});
						}
					});
				}
			});
		} else {
			// If no mutes in db, unmute everyone
			mutedMembers.each((mutedMember) => {
				unmute(mutedMember);
			});
		}

		console.log(`✅ Successfully synced ${mutedIds.length} mute${mutedIds.length == 1 ? "" : "s"}`);
	},

	// Check if new member is supposed to be muted
	async checkMute(member) {
		const now = Date.now();
		const newMember = member;
		const endTime = redis.get(newMember.user.id);

		if (endTime) {
			mutedMember = await newMember.roles.add(newMember.guild.roles.cache.find((role) => role.name == "Muted"));
			unmuteTimeout(mutedMember, endTime, endTime - now);
		}
	}
};

const unmute = (member) => {
	if (member.roles.cache.some((role) => role.name == "Muted")) {
		member.roles.remove(member.guild.roles.cache.find((role) => role.name == "Muted"));
	}
};

const unmuteTimeout = (member, endTime, time) => {
	setTimeout(() => {
		redis.get(member.user.id).then((resultTime) => {
			// Only unmute if mute hasn't been updated to a longer time
			if (resultTime <= endTime) {
				// Remove from database
				redis.del(member.user.id);

				unmute(member);
			}
		});
	}, time);
};
