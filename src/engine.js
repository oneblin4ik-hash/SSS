const SSEngine = (() => {
  const DIFFICULTY_XP = { small: 50, medium: 100, large: 200, epic: 500 };

  function streakMultiplier(days) {
    if (days >= 30) return 2.0;
    if (days >= 14) return 1.5;
    if (days >= 7)  return 1.3;
    if (days >= 3)  return 1.15;
    return 1.0;
  }

  function xpFor(quest, streak = 0) {
    const base = DIFFICULTY_XP[quest.difficulty] || 50;
    return Math.round(base * streakMultiplier(streak) * (quest.boss ? 1.25 : 1));
  }

  function xpToNextLevel(level) {
    return Math.round(500 + level * level * 50);
  }

  function tierFor(value) {
    if (value >= 80) return "Легенда";
    if (value >= 60) return "Мастер";
    if (value >= 40) return "Практик";
    if (value >= 20) return "Ученик";
    return "Новичок";
  }

  function avatarStageFor(level) { return Math.min(5, Math.floor(level / 5)); }

  function addXp(profile, amount) {
    let p = {
      ...profile,
      xp: (profile.xp || 0) + amount,
      totalXp: (profile.totalXp || 0) + amount
    };
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level = (p.level || 1) + 1;
      p.xpToNext = xpToNextLevel(p.level);
      p.avatarStage = avatarStageFor(p.level);
    }
    return p;
  }

  function subtractXp(profile, amount) {
    return {
      ...profile,
      xp:      Math.max(0, (profile.xp      || 0) - amount),
      totalXp: Math.max(0, (profile.totalXp || 0) - amount)
    };
  }

  return { DIFFICULTY_XP, xpFor, xpToNextLevel, tierFor, avatarStageFor, addXp, subtractXp };
})();
