// District standing: respect per neighbourhood, 0-100, saved and restored.
// Completing a job adds 25 in that job's district; stealing a car costs 5 in the
// district you are in. Two real effects: a respray costs half when the current
// district's respect is 40 or more, and a getaway car is parked nearby when a job
// starts in a district you hold at 60 or more.
export const DISTRICTS = ['Downtown', 'Beachfront', 'Marina', 'West End', 'Northside'];

export function districtKey(worldName) {
  if (!worldName) return 'Downtown';
  if (worldName.indexOf('Downtown') === 0) return 'Downtown';
  if (worldName.indexOf('Beachfront') === 0) return 'Beachfront';
  if (worldName.indexOf('Marina') === 0) return 'Marina';
  if (worldName.indexOf('West End') === 0) return 'West End';
  if (worldName.indexOf('Northside') === 0) return 'Northside';
  return 'Downtown';
}

export function createStanding() {
  const values = { Downtown: 10, Beachfront: 0, Marina: 0, 'West End': 0, Northside: 0 };

  function clamp(v) { return Math.max(0, Math.min(100, v)); }

  return {
    values,
    get(district) { return values[district] || 0; },
    add(district, n) { values[district] = clamp((values[district] || 0) + n); },
    set(district, n) { values[district] = clamp(n); },
    // Half-price respray at 40+ respect in the current district.
    resprayCost(base) { return this.current >= 40 ? Math.floor(base / 2) : base; },
    get current() { return values[this.currentDistrict] || 0; },
    currentDistrict: 'Downtown',
    setCurrent(district) { this.currentDistrict = district; },
    toSave() { return { ...values }; },
    fromSave(saved) {
      if (!saved) return;
      for (const d of DISTRICTS) if (typeof saved[d] === 'number') values[d] = clamp(saved[d]);
    },
  };
}
