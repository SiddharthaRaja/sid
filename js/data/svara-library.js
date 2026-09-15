/* ============================================================
   data/svara-library.js — routines and the syllabus

   Converted from the Android app's Library.kt.

   The Carnatic side follows the syllabus exactly. Its fourteen
   sections are a deliberate progression from raw pitch control to
   raga grammar, and reordering them to suit an app's navigation
   would break the pedagogy. Sections with no drill attached are
   kept as reading rather than dropped, so the progression stays
   visible instead of looking like it jumps from nothing straight
   to sarali varisai.
   ============================================================ */

const Routine = (id, name, description, exerciseIds, estimatedMinutes) =>
  ({ id, name, description, exerciseIds, estimatedMinutes });

const SyllabusSection = (number, title, subtitle, body, groups = []) =>
  ({ number, title, subtitle, body, groups: [].concat(groups || []) });

/* The Kotlin points a syllabus section at whole exercise lists. Here a
   section names the groups instead, and the UI resolves them — which
   keeps this file free of imports from the exercise modules and means
   a new exercise joins its section automatically. */
const inGroup = (g) => g;

export const ROUTINES = [
        Routine(
            "routine-quick",
            "Ten-minute warm-up",
            "The minimum that is still worth doing. Use this before Carnatic practice, or on days with no time.",
            ["sovt-straw-sustain", "sovt-straw-glide", "sovt-lip-trill-scale", "cool-descending-hum"],
            10,
        ),
        Routine(
            "routine-full",
            "Full technical session",
            "A complete workout in the right order. One demanding exercise only, deliberately.",
            [
                "sovt-straw-sustain", "sovt-lip-trill-scale", "breath-silent-inhale",
                "breath-appoggio", "chest-triad", "head-oo-siren", "mix-slide-151",
                "range-climb", "cool-descending-hum", "cool-straw-glide-down",
            ],
            35,
        ),
        Routine(
            "routine-head",
            "Head voice clarity",
            "Built around your stated goal: a clear, unbreathy head register.",
            [
                "sovt-straw-sustain", "sovt-ng", "head-straw-high", "head-oo-siren",
                "head-descending-oo", "head-staccato-hoo", "cool-descending-hum",
            ],
            25,
        ),
        Routine(
            "routine-chest",
            "Chest voice strength",
            "Firmer low and middle register. Demanding — do not run this two days in a row.",
            [
                "sovt-lip-trill-sustain", "breath-appoggio", "chest-grounded-ah",
                "chest-triad", "chest-call", "chest-descending", "cool-straw-glide-down",
            ],
            28,
        ),
        Routine(
            "routine-range",
            "Range extension",
            "Both ends. Only on a well-rested, well-warmed day.",
            [
                "sovt-straw-glide", "sovt-lip-trill-scale", "mix-passaggio-map",
                "range-descend", "range-climb", "range-full-siren", "cool-descending-hum",
            ],
            32,
        ),
        Routine(
            "routine-carnatic",
            "Carnatic daily practice",
            "Warm the voice first, then the syllabus. Sarali every day, without exception.",
            [
                "sovt-straw-sustain", "sovt-hum",
                "sarali-1", "sarali-2", "sarali-3", "sarali-4",
                "cool-descending-hum",
            ],
            30,
        ),
    ];

export const SYLLABUS = [
        SyllabusSection(0, "Orientation", "What you are actually learning",
            "Carnatic vocal training coordinates pitch, rhythm, melody, ornamentation, repertoire, language and eventually improvisation. The goal at this stage is not repertoire volume; it is building a reliable instrument.",
            []),
        SyllabusSection(1, "Nada and Shruti", "Establishing the tonal centre",
            "Set a comfortable Sa and learn to hold it against a drone. Sing S-P-S and S-M-S slowly. Move between lower, middle and upper Sa without losing the tonal centre.",
            ["drone-sa", "drone-sa-pa", "drone-sthayi-sa"]),
        SyllabusSection(2, "Swara System", "The seven swaras and the swarasthanas",
            "Learn the swara names by ear and voice. The sixteen swarasthana labels are not sixteen independent pitches — several Ri/Ga and Dha/Ni names refer to the same position depending on raga context.",
            []),
        SyllabusSection(3, "Sthayi", "The three registers",
            "Mandara, madhya and tara sthayi. Move between them keeping the same tonal centre and without pushing volume.",
            ["melsthayi-1", "melsthayi-2", "melsthayi-3"]),
        SyllabusSection(4, "Sarali Varisai", "The first systematic exercise set",
            "Pitch accuracy, laya, articulation, breath control and familiarity with the swara sequence. Learn each slowly with swara syllables, then akaram, always with tala.",
            inGroup('Sarali Varisai')),
        SyllabusSection(5, "Janta Varisai", "Paired swaras",
            "Repeated notes must sound intentional and pitch-stable, not like two attempts at the same pitch.",
            inGroup('Janta Varisai')),
        SyllabusSection(6, "Dhatu Varisai", "Non-sequential movement",
            "Interval recognition, pitch accuracy over skips, and the ability to anticipate a target note rather than slide toward it.",
            inGroup('Dhatu Varisai')),
        SyllabusSection(7, "Mel / Sthayi Varisai", "Connecting the registers",
            "Broader register and melodic movement, strengthening the connection between lower, middle and upper voice.",
            inGroup('Mel / Sthayi Varisai')),
        SyllabusSection(8, "Alankaram", "Swara patterns meet tala",
            "The seven tala structures and the five jatis. The same melodic material behaves differently when the rhythmic framework changes.",
            inGroup('Alankaram')),
        SyllabusSection(9, "Tala Fundamentals", "Angas, sapta tala, jatis",
            "Anudhrutam, dhrutam and laghu; the seven tala families; the five jatis; the 35-tala framework. At this stage the priority is reliable tala internalisation, not complex kanakku.",
            []),
        SyllabusSection(10, "Geetham", "Entering repertoire",
            "The transition from abstract exercise to actual composition: swara, sahitya, tala, raga and basic musical expression together.",
            inGroup('Geetham')),
        SyllabusSection(11, "Nottuswaram", "Stylistic contrast",
            "Dikshitar's Western-influenced pieces. Plain-note movement rather than gamaka-rich treatment — useful for hearing your own pitch accuracy without ornamentation covering for it.",
            inGroup('Nottuswaram')),
        SyllabusSection(12, "Swarajati", "Longer form",
            "Swara passages combined with sahitya, requiring greater control of raga, tala and phrasing than a beginner geetham. Study the Syama Sastri swarajatis as the repertoire advances.",
            []),
        SyllabusSection(13, "Gamaka", "The beginning of real technique",
            "Gamaka is not decoration added after the notes. Kampita, nokku, jaaru, sphurita, pratyahata. Learn each through a specific raga phrase from a teacher or authoritative recording — never from a description.",
            []),
        SyllabusSection(14, "Raga Fundamentals", "Melodic grammar",
            "A raga is more than a scale: identity comes from permitted notes, characteristic movements, phraseology, resting points, ornamentation and register behaviour. Arohana and avarohana describe but do not define it.",
            []),
    ];
