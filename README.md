# gta6

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Omar08263/gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Omar08263/gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunset Streets — 8 story jobs, district standing, radio, garage shop, crew, Air One helicopter, roadblocks. An open-world crime game set in Solmar Bay, a sun-soaked coastal city of our own. Explore twelve blocks of downtown towers, beachfront and marina on foot and by car, steal cars, outrun the Solmar Bay patrol under a 5-star wanted system, and run an eight-job story arc as Rae "Rook" Marlow — from courier runs to the marina heist finale and the smuggler's run beyond it. Traffic and pedestrians, car chases, combat, a HUD with a live minimap, synthesized WebAudio sound, and localStorage saves. Built with three.js, static files only, zero network requests at runtime.

## Systems

- **District standing** — five districts (Downtown, Beachfront, Marina, West End, Northside), respect 0–100 each. Jobs pay +25 in their district, stealing a car costs −5. At 40+ respect the spray-shop repaint costs half; at 60+ a job starts with a getaway car parked nearby. Saved with the game; the pause screen lists all five.
- **Radio** — three live-synthesized WebAudio stations, no audio files: Sunset FM (fast synthwave), Bay Talk 88 (slow bass talk), Marina Classics (slow strings). Key **C** switches station; the choice is saved.
- **Garage shop** — Rook's Garage at the west end (green sign, green minimap marker). Key **G** near the garage buys the next upgrade: Tuned Engine $800 (higher top speed), Armour Plating $600 (police ram damage halved), Racing Tires $500 (faster steering). Owned upgrades light up as ENG / ARM / TIR under the speedometer and are saved.
- **Crew** — Diz rides with you: he follows on foot, climbs in as a passenger when you take a car, and steps out with you. Finishing any job with Diz aboard pays a **15% crew bonus** on top of the reward, named on the banner.
- **Air One helicopter** — at 3 wanted stars or more a police helicopter circles overhead with a spinning rotor and a searchlight cone (white dot on the minimap); it leaves when the heat hits zero.
- **Roadblocks** — at 4 wanted stars or more two patrol cruisers park across the road ahead of you with a real collision and a ROADBLOCK AHEAD warning; they clear when the heat drops.
- **Eight story jobs** — Job 1 First Delivery, Job 2 Sunset Sprint, Job 3 Tail the Courier, Job 4 Hot Getaway, Job 5 The Marina Heist, Job 6 Bay Taxi (pick up the fare, drop them at the lighthouse), Job 7 Drift King (60 seconds to Northside), Job 8 Smuggler's Run (reach the Marina with the patrol still on you).
- **HUD** — wanted stars, cash, health, clock, radio station, district + respect bar, objective, speed, garage icons, crew badge, live minimap with mission blip, police, roadblock and helicopter marks.

## Controls

WASD / arrows drive and walk · Mouse drag camera · **E** enter / steal car · **M** next job · **R** restart job · **Space** handbrake · **Q** punch · **C** radio · **G** garage shop (near Rook's Garage) · **P** pause · **Enter** start

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

Entered on [make.fun](https://make.fun/?ref={referral_code}&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
