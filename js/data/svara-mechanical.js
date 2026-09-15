/* ============================================================
   data/svara-mechanical.js — the mechanical exercise library

   Converted from the Android app's MechanicalExercises.kt by a
   script, not by hand: 32 exercises of step timings and prose is
   exactly the kind of retyping that puts a typo in one of them and
   nowhere else. The data is byte-identical to the Kotlin.

   Organised as a session should run, not alphabetically: SOVT first
   because it is the best-evidenced way to start, then breath, then
   the register work, then range, then agility, then cool-down. The
   order is the advice.

   Pitch targets are semitones relative to the singer's own base
   note, set in the Svara tab — a bass and a tenor need the same
   exercise at different absolute pitches, and hardcoding C3 tells
   half your singers to strain.
   ============================================================ */

const Ex = (o) => ({ discipline: 'Mechanical', intensity: 'Moderate', tips: [], steps: [],
                     baseOffset: 0, repeats: 1, repeatShift: 0, ...o });

/** seconds, label, cue, semitones above base, glide target */
const Step = (seconds, label, cue = null, semitones = null, glideTo = null) =>
  ({ seconds, label, cue, semitones, glideTo });

const hold  = (sec, label, semis, cue = null) => Step(sec, label, cue, semis);
const glide = (sec, label, from, to, cue = null) => Step(sec, label, cue, from, to);
const free  = (sec, label, cue = null) => Step(sec, label, cue, null);

const DEGREE = { 0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 11: '7', 12: '8' };
const degreeName = (s) => DEGREE[s] || (s >= 0 ? `+${s}` : String(s));

/** A run of notes, one per secPerNote, from a list of semitone offsets. */
const run = (offsets, secPerNote, labelFor = degreeName, cueAt = {}) =>
  offsets.map((s, i) => Step(secPerNote, labelFor(s), cueAt[i] || null, s));

const MAJOR_5 = [0, 2, 4, 5, 7]
const MAJOR_5_DOWN = [7, 5, 4, 2, 0]
const TRIAD_UP_DOWN = [0, 4, 7, 12, 7, 4, 0]
const SCALE_9_UP_DOWN = [0, 2, 4, 5, 7, 5, 4, 2, 0]

    // ------------------------------------------------------------- warm-up SOVT
const warmup = [
        Ex({
            id: "sovt-straw-sustain",
            name: "Straw phonation — sustained",
            subtitle: "the single best way to start",
            group: "Warm-up · SOVT",
            discipline: 'Mechanical',
            instruction: "Hum through a narrow straw. Steady, quiet, no pushing.",
            intensity: 'Gentle',
            steps: [
                free(3.0, "Set up", "straw between the lips, cheeks soft, jaw loose"),
                hold(8.0, "Hold", 0.0, "quiet and even — you are not trying to be loud"),
                free(3.0, "Breathe", "low, silent inhale"),
                hold(8.0, "Hold", 2.0, "same effort, one step up"),
                free(3.0, "Breathe"),
                hold(8.0, "Hold", 4.0),
                free(3.0, "Breathe"),
                hold(8.0, "Hold", 2.0),
                free(3.0, "Breathe"),
                hold(8.0, "Hold", 0.0, "finish where you started"),
            ],
            tips: [
                "Semi-occluded vocal tract exercises work by raising the pressure above the vocal folds, which lets them vibrate with less collision force. It is the closest thing to a free lunch in voice training.",
                "A narrower straw is harder. Start with a normal drinking straw; a coffee stirrer is an advanced version, not a better one.",
                "You should feel buzzing on the lips and front of the face, not effort in the throat.",
                "If your cheeks puff out hard, you are pushing too much air. Back off.",
                "Two to five minutes of this is a complete warm-up on a day when you have no time.",
            ],
        }),

        Ex({
            id: "sovt-straw-glide",
            name: "Straw glides",
            subtitle: "sirens through the straw",
            group: "Warm-up · SOVT",
            discipline: 'Mechanical',
            instruction: "Slide smoothly up and down through the straw. No breaks, no gear changes.",
            intensity: 'Gentle',
            steps: [
                free(3.0, "Set up", "straw in, breath low"),
                glide(5.0, "Up", 0.0, 12.0, "one smooth ramp — do not step"),
                glide(5.0, "Down", 12.0, 0.0),
                free(3.0, "Breathe"),
                glide(6.0, "Up", 0.0, 16.0, "further this time, still smooth"),
                glide(6.0, "Down", 16.0, 0.0),
                free(3.0, "Breathe"),
                glide(7.0, "Up", -5.0, 19.0, "your full comfortable span"),
                glide(7.0, "Down", 19.0, -5.0),
            ],
            tips: [
                "Watch the trace on screen. A smooth glide draws a clean diagonal; a register break draws a step or a gap.",
                "The straw makes register transitions much easier than an open vowel. That is the point — you are teaching the transition in easy mode first.",
                "If the sound cuts out at the top, lower the ceiling rather than pushing harder.",
                "Do this before any open-vowel exercise, every session.",
            ],
        }),

        Ex({
            id: "sovt-lip-trill-sustain",
            name: "Lip trill — sustained",
            subtitle: "brrr on one note",
            group: "Warm-up · SOVT",
            discipline: 'Mechanical',
            instruction: "Loose lips, steady buzz. Support with breath, not with the throat.",
            intensity: 'Gentle',
            steps: [
                free(3.0, "Set up", "lips loose — if they won't trill, rest fingers on your cheeks"),
                hold(6.0, "Hold", 0.0),
                free(2.5, "Breathe"),
                hold(6.0, "Hold", 2.0),
                free(2.5, "Breathe"),
                hold(6.0, "Hold", 4.0),
                free(2.5, "Breathe"),
                hold(6.0, "Hold", 5.0),
                free(2.5, "Breathe"),
                hold(6.0, "Hold", 7.0, "steady — the trill should not speed up or stall"),
            ],
            tips: [
                "A trill that keeps stopping usually means too much air pressure or too much lip tension, not too little.",
                "Resting two fingers on your cheeks and lifting slightly makes the trill much easier to sustain.",
                "The trill rate tells you about your airflow: if it stutters, your support is uneven.",
                "The pitch under a lip trill is still real pitch. The monitor reads it fine — use it.",
            ],
        }),

        Ex({
            id: "sovt-lip-trill-scale",
            name: "Lip trill — five-tone scale",
            subtitle: "climbing by semitones",
            group: "Warm-up · SOVT",
            discipline: 'Mechanical',
            instruction: "Trill up and down a five-note scale. Each repeat starts a semitone higher.",
            intensity: 'Gentle',
            steps: [...run(SCALE_9_UP_DOWN, 0.55), ...[free(1.8, "Breathe")]],
            repeats: 10,
            repeatShift: 1,
            tips: [
                "Ten repeats climbs almost an octave. Stop early if the trill starts breaking — that is your ceiling for today, and it moves day to day.",
                "Keep the volume the same as you climb. The instinct to get louder as you go up is the thing to unlearn.",
                "This is where the pitch graph earns its keep: the top of each arch is where accuracy fails first.",
            ],
        }),

        Ex({
            id: "sovt-tongue-trill",
            name: "Tongue trill",
            subtitle: "rolled R",
            group: "Warm-up · SOVT",
            discipline: 'Mechanical',
            instruction: "Rolled R, steady and even, through a five-note scale.",
            intensity: 'Gentle',
            steps: [...run(SCALE_9_UP_DOWN, 0.55), ...[free(1.8, "Breathe")]],
            repeats: 8,
            repeatShift: 1,
            tips: [
                "If you cannot roll an R, use the lip trill instead — there is no benefit you lose.",
                "The tongue trill sits further back than the lip trill and some singers find it releases jaw tension better. Try both, keep the one that helps you.",
                "Tongue tip light against the ridge behind the top teeth. Force kills the roll.",
            ],
        }),

        Ex({
            id: "sovt-hum",
            name: "Humming",
            subtitle: "closed mm",
            group: "Warm-up · SOVT",
            discipline: 'Mechanical',
            instruction: "Lips closed, teeth apart, jaw released. Feel the buzz in the face.",
            intensity: 'Gentle',
            steps: [
                free(3.0, "Set up", "lips together, teeth apart — that gap matters"),
                hold(6.0, "Hold", 0.0),
                free(2.0, "Breathe"),
                hold(6.0, "Hold", 4.0),
                free(2.0, "Breathe"),
                hold(6.0, "Hold", 7.0),
                free(2.0, "Breathe"),
                hold(6.0, "Hold", 4.0),
                free(2.0, "Breathe"),
                hold(8.0, "Long hold", 0.0, "as long and steady as you comfortably can"),
            ],
            tips: [
                "Teeth apart is the whole trick. Humming with clenched teeth just trains a tight jaw.",
                "You are looking for vibration on the lips, nose and cheekbones. If you feel it in the throat, you are pressing.",
                "Humming is the gentlest SOVT and the one to use when your voice feels tired or you are recovering.",
                "Use this as the last thing you do at night if you have been talking or singing all day.",
            ],
        }),

        Ex({
            id: "sovt-ng",
            name: "Ng",
            subtitle: "the sound at the end of 'sing'",
            group: "Warm-up · SOVT",
            discipline: 'Mechanical',
            instruction: "Hold the 'ng'. Tongue back is up, mouth can stay open.",
            intensity: 'Gentle',
            steps: [
                free(3.0, "Set up", "say 'sing' and stop on the ng"),
                glide(5.0, "Slide up", 0.0, 12.0),
                glide(5.0, "Slide down", 12.0, 0.0),
                free(2.5, "Breathe"),
                hold(6.0, "Hold high", 12.0, "should feel easy, not thin"),
                free(2.5, "Breathe"),
                glide(6.0, "Up", 0.0, 16.0),
                glide(6.0, "Down", 16.0, 0.0),
            ],
            tips: [
                "Ng is unusually good for finding head voice without effort, because the tongue closure does the work the throat would otherwise try to do.",
                "Once a note feels easy on ng, open slowly to 'ah' while keeping the same sensation. That transfer is the actual exercise.",
                "No nasal pinching. The sound is nasal by design here; that is fine and temporary.",
            ],
        }),

        Ex({
            id: "sovt-vz",
            name: "Voiced fricatives",
            subtitle: "vvv and zzz",
            group: "Warm-up · SOVT",
            discipline: 'Mechanical',
            instruction: "Sustained 'v' then 'z'. Steady buzz, constant pressure.",
            intensity: 'Gentle',
            steps: [
                free(2.5, "Set up", "top teeth on bottom lip for 'v'"),
                hold(7.0, "vvv", 0.0),
                free(2.5, "Breathe"),
                hold(7.0, "vvv", 4.0),
                free(2.5, "Switch", "now 'z'"),
                hold(7.0, "zzz", 0.0),
                free(2.5, "Breathe"),
                hold(7.0, "zzz", 4.0),
            ],
            tips: [
                "These are partial occlusions rather than full ones, so they build more pressure than a hum. Good for waking a sleepy voice.",
                "Keep the buzz absolutely even. Any wobble is airflow, and airflow is trainable.",
            ],
        }),
    ]

    // ------------------------------------------------------------------- breath
const breath = [
        Ex({
            id: "breath-silent-inhale",
            name: "Silent inhale, counted hiss",
            subtitle: "the foundation",
            group: "Breath",
            discipline: 'Mechanical',
            instruction: "Breathe in silently and low. Hiss out evenly on a steady count.",
            intensity: 'Gentle',
            steps: [
                free(4.0, "Inhale", "silent — noise means a tight throat"),
                free(8.0, "Hiss", "sssss — perfectly even, no fading"),
                free(3.0, "Recover"),
                free(4.0, "Inhale"),
                free(12.0, "Hiss", "longer, same steadiness"),
                free(3.0, "Recover"),
                free(4.0, "Inhale"),
                free(16.0, "Hiss", "hold the pressure to the very end"),
            ],
            tips: [
                "A noisy inhale means you are pulling air through a narrow throat. Open, quiet, low.",
                "The belly and lower ribs expand outward on the inhale. The shoulders do not rise.",
                "The hiss must not fade at the end. Running out is fine; sagging is the fault.",
                "This is the single most transferable exercise here — everything else gets easier when breath is steady.",
            ],
        }),

        Ex({
            id: "breath-farinelli",
            name: "Farinelli breathing",
            subtitle: "in, suspend, out — equal counts",
            group: "Breath",
            discipline: 'Mechanical',
            instruction: "Equal counts in, suspended, out. The suspension is open, not held shut.",
            intensity: 'Gentle',
            steps: [
                free(4.0, "In", "4 counts"),
                free(4.0, "Suspend", "throat stays open — do not lock it"),
                free(4.0, "Out", "4 counts, even"),
                free(2.0, "Rest"),
                free(5.0, "In"), free(5.0, "Suspend"), free(5.0, "Out"),
                free(2.0, "Rest"),
                free(6.0, "In"), free(6.0, "Suspend"), free(6.0, "Out"),
                free(2.0, "Rest"),
                free(7.0, "In"), free(7.0, "Suspend"), free(7.0, "Out"),
            ],
            tips: [
                "Suspension is not holding your breath. The throat stays open and the air simply does not move.",
                "If you feel pressure in your head or face, you are locking. Stop, breathe normally, restart shorter.",
                "Build the count over weeks, not within one session.",
            ],
            caution: "Stop if you feel lightheaded. This is a control exercise, not an endurance contest.",
        }),

        Ex({
            id: "breath-appoggio",
            name: "Steady tone at constant volume",
            subtitle: "appoggio",
            group: "Breath",
            discipline: 'Mechanical',
            instruction: "One vowel, one pitch, one volume, for as long as it stays honest.",
            intensity: 'Moderate',
            steps: [
                free(3.0, "Prepare", "low silent breath"),
                hold(12.0, "ah", 0.0, "no swell, no fade, no wobble"),
                free(4.0, "Recover"),
                hold(12.0, "ah", 4.0),
                free(4.0, "Recover"),
                hold(12.0, "ah", 7.0),
                free(4.0, "Recover"),
                hold(14.0, "ah", 4.0, "longest one — keep it level"),
            ],
            tips: [
                "The pitch line on screen is a lie detector here. A steady tone draws a flat line; a wobble in support draws a ripple.",
                "The instinct is to let the tone fade as air runs out. Resist it — that is the trainable part.",
                "Ribs stay expanded as long as you can manage. Collapse at the end, not the start.",
                "If the line drifts flat over the hold, you are losing support, not losing pitch memory.",
            ],
        }),

        Ex({
            id: "breath-sz-ratio",
            name: "s/z ratio check",
            subtitle: "a rough health signal",
            group: "Breath",
            discipline: 'Mechanical',
            instruction: "Time a maximum 'sss', then a maximum 'zzz'. Compare them.",
            intensity: 'Gentle',
            steps: [
                free(3.0, "Prepare"),
                free(20.0, "sss", "as long as you can, steady"),
                free(6.0, "Recover"),
                free(3.0, "Prepare"),
                free(20.0, "zzz", "as long as you can, steady"),
            ],
            tips: [
                "'s' is unvoiced and 'z' is voiced, so they use the same air with and without the folds working. Similar times suggest the folds are closing efficiently.",
                "A 'z' much shorter than your 's' can indicate the folds are not closing well. It is a rough screen, not a diagnosis.",
                "If your ratio is consistently poor and your voice tires quickly, that is a reason to see an ENT or a speech-language pathologist, not a reason to practise harder.",
            ],
        }),
    ]

    // ------------------------------------------------------------- chest voice
const chest = [
        Ex({
            id: "chest-grounded-ah",
            name: "Grounded ah",
            subtitle: "weight without push",
            group: "Chest voice",
            discipline: 'Mechanical',
            instruction: "Comfortable low notes on an open 'ah'. Full but relaxed.",
            intensity: 'Moderate',
            baseOffset: -5,
            steps: [
                free(3.0, "Prepare", "speak 'ah' first, then sing the same sound"),
                hold(6.0, "ah", 0.0, "speaking weight, not shouting"),
                free(2.5, "Breathe"),
                hold(6.0, "ah", 2.0),
                free(2.5, "Breathe"),
                hold(6.0, "ah", 4.0),
                free(2.5, "Breathe"),
                hold(6.0, "ah", 2.0),
                free(2.5, "Breathe"),
                hold(8.0, "ah", 0.0),
            ],
            tips: [
                "Chest voice gets stronger from efficient closure, not from volume. Loud is a shortcut that costs you later.",
                "Start from your speaking voice. If the sung note feels heavier than speaking, you are adding effort that does not help.",
                "Jaw loose, tongue forward and low, throat open. Check in a mirror once — most people tighten the jaw without noticing.",
                "Chest work is the most tiring thing in this library. Keep it short and stop while it still feels good.",
            ],
        }),

        Ex({
            id: "chest-triad",
            name: "Chest triad — 1 3 5 3 1",
            subtitle: "building strength through the low-mid",
            group: "Chest voice",
            discipline: 'Mechanical',
            instruction: "Sing 1-3-5-3-1 on 'ah'. Same weight on every note.",
            intensity: 'Moderate',
            baseOffset: -3,
            steps: [...run([0, 4, 7, 4, 0], 0.7), ...[free(2.0, "Breathe")]],
            repeats: 8,
            repeatShift: 1,
            tips: [
                "The fifth is where people push. It should not be louder than the root.",
                "Climbing by semitones each repeat means you will eventually reach your break. Stop one or two repeats before it, not after.",
                "Watch the graph on the way down — descending back through 3 to 1 is where pitch usually goes sharp.",
            ],
        }),

        Ex({
            id: "chest-call",
            name: "Bratty call",
            subtitle: "nay / gee on a five-tone scale",
            group: "Chest voice",
            discipline: 'Mechanical',
            instruction: "A slightly nasal, bratty 'nay'. Ugly is fine — this is a tool, not a sound.",
            intensity: 'Demanding',
            baseOffset: 0,
            steps: [...run(SCALE_9_UP_DOWN, 0.5), ...[free(2.0, "Breathe")]],
            repeats: 10,
            repeatShift: 1,
            tips: [
                "The bratty quality encourages firm fold closure without the throat squeezing. It is meant to sound unpleasant in isolation.",
                "Keep it small and bright rather than loud and heavy. If you are shouting, you have lost the exercise.",
                "This is the most effective single exercise for carrying chest weight higher, and also the easiest to overdo. Five minutes maximum.",
            ],
            caution: "Stop immediately if you feel any scratchiness. This one is demanding on the folds.",
        }),

        Ex({
            id: "chest-descending",
            name: "Descending five-tone",
            subtitle: "5 4 3 2 1 on 'ah'",
            group: "Chest voice",
            discipline: 'Mechanical',
            instruction: "Start at the fifth and walk down. Keep the tone equally full at the bottom.",
            intensity: 'Moderate',
            baseOffset: -2,
            steps: [...run(MAJOR_5_DOWN, 0.7), ...[free(2.0, "Breathe")]],
            repeats: 8,
            repeatShift: -1,
            tips: [
                "Descending exercises let the voice find low notes without grabbing for them.",
                "The bottom note should still have tone. If it turns to rattle, you are below your usable range today.",
                "Each repeat moves down a semitone. Stop when the tone stops being clean, not when you run out of notes.",
            ],
        }),
    ]

    // -------------------------------------------------------------- head voice
const head = [
        Ex({
            id: "head-oo-siren",
            name: "Head voice sirens",
            subtitle: "oo, light and clear",
            group: "Head voice",
            discipline: 'Mechanical',
            instruction: "Narrow 'oo', light and forward. Glide up and back down without a seam.",
            intensity: 'Gentle',
            baseOffset: 7,
            steps: [
                free(3.0, "Prepare", "small round lips, tiny sound"),
                glide(4.0, "Up", 0.0, 9.0),
                glide(4.0, "Down", 9.0, 0.0),
                free(2.5, "Breathe"),
                glide(4.5, "Up", 0.0, 12.0),
                glide(4.5, "Down", 12.0, 0.0),
                free(2.5, "Breathe"),
                glide(5.0, "Up", 0.0, 15.0, "as high as stays easy"),
                glide(5.0, "Down", 15.0, 0.0),
            ],
            tips: [
                "Clarity in head voice comes from consistent fold closure at low volume, not from more air. Breathiness is usually too much air, not too little support.",
                "Think small and bright rather than big and round. Head voice that is trying to be impressive is head voice that is being pushed.",
                "'oo' narrows the vocal tract and makes head voice easier to find. Once it is reliable, migrate to 'ee' then 'ah'.",
                "If the tone goes breathy at the top, come down and try again quieter — quieter usually fixes breathiness, which is counterintuitive.",
            ],
        }),

        Ex({
            id: "head-descending-oo",
            name: "Descending from head",
            subtitle: "5 4 3 2 1 on 'oo'",
            group: "Head voice",
            discipline: 'Mechanical',
            instruction: "Start high and light on 'oo', walk down without letting weight creep in.",
            intensity: 'Gentle',
            baseOffset: 12,
            steps: [...run(MAJOR_5_DOWN, 0.7), ...[free(2.0, "Breathe")]],
            repeats: 8,
            repeatShift: -1,
            tips: [
                "Descending from head voice is the most reliable way to carry head quality lower, which is what a mixed voice actually is.",
                "The moment you feel the tone thicken, you have hit the transition. Note where. That note is your working edge.",
                "Do not let the volume grow as you descend. The whole point is keeping the light quality below where it wants to live.",
            ],
        }),

        Ex({
            id: "head-staccato-hoo",
            name: "Staccato hoo",
            subtitle: "light onsets in head voice",
            group: "Head voice",
            discipline: 'Mechanical',
            instruction: "Short, light 'hoo' on each note of a triad. Clean starts, no pushing.",
            intensity: 'Moderate',
            baseOffset: 7,
            steps: [...run(TRIAD_UP_DOWN, 0.45), ...[free(2.0, "Breathe")]],
            repeats: 6,
            repeatShift: 1,
            tips: [
                "Staccato trains onset accuracy. The pitch should be right the instant the note starts, with no scoop.",
                "The 'h' keeps the onset gentle. A hard glottal start at this pitch is not useful and is not kind to the folds.",
                "Watch the graph: each note should appear as a flat dash at the right height, not a rising tick.",
            ],
        }),

        Ex({
            id: "head-straw-high",
            name: "Straw in head voice",
            subtitle: "clarity without effort",
            group: "Head voice",
            discipline: 'Mechanical',
            instruction: "Straw phonation but up high. Find the ease first, then remove the straw.",
            intensity: 'Gentle',
            baseOffset: 12,
            steps: [
                free(3.0, "Straw in"),
                hold(7.0, "Hold", 0.0),
                free(2.5, "Breathe"),
                hold(7.0, "Hold", 4.0),
                free(2.5, "Breathe"),
                hold(7.0, "Hold", 7.0),
                free(3.0, "Straw out", "same note, same feeling, on 'oo'"),
                hold(7.0, "Open hold", 7.0, "keep the ease you just had"),
                free(3.0, "Breathe"),
                hold(7.0, "Open hold", 4.0),
            ],
            tips: [
                "The transfer step is the exercise. Anyone can sound easy through a straw; the skill is keeping it when the straw comes out.",
                "If the open version tightens, go back to the straw for one more repetition rather than pushing through.",
                "This is the most direct route to head voice clarity in this whole library.",
            ],
        }),
    ]

    // ---------------------------------------------------------------- passaggio
const passaggio = [
        Ex({
            id: "mix-passaggio-map",
            name: "Find your passaggio",
            subtitle: "a measurement, not a workout",
            group: "Mix & passaggio",
            discipline: 'Mechanical',
            instruction: "Slow glide up on 'ah'. Notice exactly where the tone wants to change.",
            intensity: 'Gentle',
            steps: [
                free(4.0, "Prepare", "you are observing, not performing"),
                glide(10.0, "Slow glide up", -3.0, 17.0, "do not force through anything"),
                free(4.0, "Note where it changed"),
                glide(10.0, "Slow glide down", 17.0, -3.0),
                free(4.0, "Breathe"),
                glide(10.0, "Again, quieter", -3.0, 17.0, "quieter usually moves the seam"),
                glide(10.0, "Down", 17.0, -3.0),
            ],
            tips: [
                "Everyone has a passaggio. Hearing yours is not a fault you discovered; it is the map you need.",
                "Note the pitch where the change happens. That is where your mix work lives for the next few months.",
                "Singing more quietly usually shifts the transition and makes it smoother. That is information about pressure, not about your range.",
                "Run this once every few weeks and watch the seam soften. It will not disappear; it will stop being audible.",
            ],
        }),

        Ex({
            id: "mix-nay-octave",
            name: "Octave repeats on 'nay'",
            subtitle: "through the break",
            group: "Mix & passaggio",
            discipline: 'Mechanical',
            instruction: "1-8-1 on a bright 'nay'. Same colour top and bottom.",
            intensity: 'Demanding',
            baseOffset: 0,
            steps: [...run([0, 12, 0], 0.8), ...[free(2.2, "Breathe")]],
            repeats: 10,
            repeatShift: 1,
            tips: [
                "The octave leap crosses the passaggio without giving you time to prepare, which is exactly why it works.",
                "The top note must not be louder. If it is, you jumped into chest rather than mixing.",
                "The bright, slightly nasal 'nay' keeps the larynx stable across the leap.",
                "Ten repeats is a full workout for this one. Do not chain it with the bratty call in the same session.",
            ],
            caution: "Demanding. Stop at the first sign of scratchiness or fatigue.",
        }),

        Ex({
            id: "mix-slide-151",
            name: "1-5-1 slides",
            subtitle: "connected, no gear change",
            group: "Mix & passaggio",
            discipline: 'Mechanical',
            instruction: "Slide up to the fifth and back, connected the whole way.",
            intensity: 'Moderate',
            baseOffset: 2,
            steps: [
                glide(1.6, "Up to 5", 0.0, 7.0),
                glide(1.6, "Back to 1", 7.0, 0.0),
                free(1.6, "Breathe"),
            ],
            repeats: 12,
            repeatShift: 1,
            tips: [
                "Slides are diagnostic. The graph shows exactly where the line breaks, and that is where your attention goes.",
                "A connected slide means no step in the trace. A step means a register flip.",
                "Twelve repeats climbs an octave. Let the last few be quieter rather than bigger.",
            ],
        }),
    ]

    // ------------------------------------------------------------------- range
const range = [
        Ex({
            id: "range-climb",
            name: "Range climb",
            subtitle: "five-tone scale, semitone by semitone",
            group: "Range",
            discipline: 'Mechanical',
            instruction: "Five-tone scale on a comfortable vowel, moving up one semitone per repeat.",
            intensity: 'Demanding',
            baseOffset: 0,
            steps: [...run(SCALE_9_UP_DOWN, 0.5), ...[free(2.0, "Breathe")]],
            repeats: 14,
            repeatShift: 1,
            tips: [
                "Range is extended by working the edge lightly and often, not by attacking the top of it hard once a week.",
                "The last two or three repeats should feel like effort but not like strain. If you cannot tell the difference yet, stop earlier.",
                "Range gains show up over weeks. Log where you stopped and compare in a month rather than in a session.",
                "Warm up properly before this. Cold range work is how singers hurt themselves.",
            ],
            caution: "Never push past pain, scratchiness or a locked feeling. Range grows from consistency, not from single hard sessions.",
        }),

        Ex({
            id: "range-descend",
            name: "Low range extension",
            subtitle: "descending, kept clean",
            group: "Range",
            discipline: 'Mechanical',
            instruction: "Descending five-tone scale, one semitone lower each repeat. Keep tone, not just pitch.",
            intensity: 'Moderate',
            baseOffset: -2,
            steps: [...run(MAJOR_5_DOWN, 0.75), ...[free(2.0, "Breathe")]],
            repeats: 10,
            repeatShift: -1,
            tips: [
                "Low notes extend by relaxing, not by pressing down. Any downward push on the larynx is wasted effort and a bad habit.",
                "A note that only comes out as fry does not count as range. Stop where the tone is still real.",
                "Morning is usually the best time for low range work; the voice sits lower before it is fully warm.",
            ],
        }),

        Ex({
            id: "range-full-siren",
            name: "Full-range siren",
            subtitle: "everything you have, smoothly",
            group: "Range",
            discipline: 'Mechanical',
            instruction: "One continuous glide from your bottom to your top and back. No breaks.",
            intensity: 'Moderate',
            baseOffset: 0,
            steps: [
                free(4.0, "Prepare", "'ng' or a lip trill — whichever is easier for you"),
                glide(8.0, "All the way up", -7.0, 20.0),
                glide(8.0, "All the way down", 20.0, -7.0),
                free(4.0, "Breathe"),
                glide(8.0, "Up", -7.0, 20.0),
                glide(8.0, "Down", 20.0, -7.0),
            ],
            tips: [
                "This is the single best picture of your instrument. Screenshot the trace occasionally and compare over months.",
                "Any gap in the trace is a place where the voice disconnects. Those gaps are the actual training targets.",
                "Do it on a lip trill or 'ng' rather than an open vowel, so the extremes cost you nothing.",
            ],
        }),
    ]

    // ----------------------------------------------------------------- agility
const agility = [
        Ex({
            id: "agility-fast-scale",
            name: "Fast five-tone runs",
            subtitle: "clean at speed",
            group: "Agility",
            discipline: 'Mechanical',
            instruction: "Same five-tone scale, faster. Every note still gets its own pitch.",
            intensity: 'Moderate',
            baseOffset: 0,
            steps: [...run(SCALE_9_UP_DOWN, 0.24), ...[free(1.6, "Breathe")]],
            repeats: 10,
            repeatShift: 1,
            tips: [
                "Speed that blurs the pitches is not agility, it is noise. The graph shows the difference immediately.",
                "If the trace turns into a smear instead of nine steps, slow down until it separates again.",
                "This is the direct Western analogue of the syllabus's warning about third speed becoming a blur of approximate pitches.",
            ],
        }),

        Ex({
            id: "agility-arpeggio",
            name: "Arpeggio runs",
            subtitle: "1 3 5 8 5 3 1",
            group: "Agility",
            discipline: 'Mechanical',
            instruction: "Arpeggio up and down. Land each note rather than sliding between them.",
            intensity: 'Moderate',
            baseOffset: 0,
            steps: [...run(TRIAD_UP_DOWN, 0.32), ...[free(1.8, "Breathe")]],
            repeats: 10,
            repeatShift: 1,
            tips: [
                "Arpeggios are the Western cousin of dhatu varisai — both train hitting a target rather than approaching it.",
                "The octave is the hard one. It should arrive in tune, not arrive and then get corrected.",
            ],
        }),

        Ex({
            id: "agility-staccato-triad",
            name: "Staccato triad",
            subtitle: "onset precision",
            group: "Agility",
            discipline: 'Mechanical',
            instruction: "Short detached notes on a triad. Silence between them should be real silence.",
            intensity: 'Moderate',
            baseOffset: 2,
            steps: [...run([0, 4, 7, 4, 0], 0.35), ...[free(1.8, "Breathe")]],
            repeats: 10,
            repeatShift: 1,
            tips: [
                "The breath stops the note, not the throat. Closing the glottis to cut off a note is a habit worth not building.",
                "Each note should read on the graph as a clean flat dash at the right height.",
            ],
        }),
    ]

    // --------------------------------------------------------------- cool-down
const cooldown = [
        Ex({
            id: "cool-descending-hum",
            name: "Descending hum",
            subtitle: "putting the voice away",
            group: "Cool-down",
            discipline: 'Mechanical',
            instruction: "Gentle hums, walking downward. Quiet, easy, no work.",
            intensity: 'Gentle',
            baseOffset: 4,
            steps: [
                hold(5.0, "Hum", 0.0, "half your practice volume"),
                free(2.0, "Breathe"),
                hold(5.0, "Hum", -2.0),
                free(2.0, "Breathe"),
                hold(5.0, "Hum", -4.0),
                free(2.0, "Breathe"),
                hold(6.0, "Hum", -5.0, "softer still"),
                free(2.0, "Breathe"),
                hold(6.0, "Hum", -7.0),
            ],
            tips: [
                "Cooling down is not optional if you have done chest or range work. It brings the voice back to speech comfortably.",
                "Everything here should be quieter and easier than what came before. If it feels like work, you are still practising.",
                "Two or three minutes is enough.",
            ],
        }),

        Ex({
            id: "cool-sighs",
            name: "Descending sighs",
            subtitle: "release",
            group: "Cool-down",
            discipline: 'Mechanical',
            instruction: "Easy sighs from mid range down to speech. Let go rather than sing.",
            intensity: 'Gentle',
            steps: [
                glide(3.5, "Sigh", 9.0, -2.0, "loose jaw, no effort"),
                free(2.5, "Breathe"),
                glide(3.5, "Sigh", 7.0, -3.0),
                free(2.5, "Breathe"),
                glide(3.5, "Sigh", 5.0, -4.0),
                free(2.5, "Breathe"),
                glide(4.0, "Sigh", 4.0, -5.0),
            ],
            tips: [
                "A sigh is the most natural gesture your voice makes. It is a good last thing to leave it doing.",
                "Do not aim for accuracy here. This is the one exercise where the graph does not matter.",
            ],
        }),

        Ex({
            id: "cool-straw-glide-down",
            name: "Straw glides, downward",
            subtitle: "the gentlest finish",
            group: "Cool-down",
            discipline: 'Mechanical',
            instruction: "Slow downward glides through the straw. Very quiet.",
            intensity: 'Gentle',
            steps: [
                glide(6.0, "Down", 12.0, 0.0),
                free(3.0, "Breathe"),
                glide(6.0, "Down", 10.0, -2.0),
                free(3.0, "Breathe"),
                glide(6.0, "Down", 7.0, -4.0),
                free(3.0, "Breathe"),
                glide(7.0, "Down", 5.0, -5.0),
            ],
            tips: [
                "SOVT is as good for cooling down as for warming up, for the same reason: it lets the folds vibrate with less impact.",
                "If your voice feels tired tomorrow morning, add more of this and less of the demanding work.",
            ],
        }),
    ]

/* Reference pace per group. For a mechanical exercise this is a dial
   against the written step timings rather than a beat count, so a
   slower number means "these steps are meant to be unhurried" — and
   you can still move it. */
const PACE = {
  'Warm-up · SOVT': 54,
  'Breath': 44,
  'Chest voice': 60,
  'Head voice': 56,
  'Mix & passaggio': 64,
  'Range': 60,
  'Agility': 84,
  'Cool-down': 40,
};

/** Groups in the order a session should run them. */
export const MECH_GROUPS = [
  'Warm-up · SOVT', 'Breath', 'Chest voice', 'Head voice',
  'Mix & passaggio', 'Range', 'Agility', 'Cool-down',
];

export const MECHANICAL = [...warmup, ...breath, ...chest, ...head,
                           ...passaggio, ...range, ...agility, ...cooldown]
  .map(ex => ({ ...ex, bpm: PACE[ex.group] || 60 }));
