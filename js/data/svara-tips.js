/* ============================================================
   data/svara-tips.js — vocal health and lifestyle guidance

   Converted from the Android app's Tips.kt. Same bias as the rest
   of the app: say what is well supported, say plainly when
   something is folklore, and never dress a habit up as physiology.
   A lot of singer advice circulates as confident fact when the
   evidence is thin, and an app repeating it does real harm.
   ============================================================ */

const TipSection = (title, summary, items) => ({ title, summary, items });
const Tip = (heading, body, caveat = null) => ({ heading, body, caveat });

export const TIP_SECTIONS = [

        TipSection(
            "Hydration",
            "The most useful thing you can do for your voice, and the most misunderstood.",
            [
                Tip(
                    "Systemic hydration is what matters",
                    "Vocal folds vibrate more easily when the tissue is well hydrated, which lowers the pressure needed to start a note. That hydration comes from drinking water over hours, not from a sip before you sing.",
                ),
                Tip(
                    "Nothing you drink touches your vocal folds",
                    "Anything you swallow goes down the oesophagus. Warm honey and lemon soothes the throat and feels good, and there is nothing wrong with that — but it works on the pharynx, not on the folds. Do not expect it to fix a voice problem.",
                ),
                Tip(
                    "Steam is the exception",
                    "Inhaled steam is the one thing that reaches the larynx directly and adds surface moisture. A bowl of hot water and a towel for five to ten minutes is enough. Plain water — no oils, no additives.",
                    "Studies on steam and voice quality are small and mixed. Most singers report it helps; treat that as reasonable rather than proven.",
                ),
                Tip(
                    "Watch what dries you out",
                    "Alcohol, heavy caffeine, dry aircraft and air-conditioned rooms, and many antihistamines all reduce tissue moisture. You do not have to avoid them; you do have to drink more when you have them.",
                ),
                Tip(
                    "Pale urine is the practical test",
                    "It is unglamorous and it is the check that actually works. If it is dark, you are behind and your voice will tell you before the day is out.",
                ),
            ],
        ),

        TipSection(
            "Sleep",
            "The most underrated variable in singing, by a wide margin.",
            [
                Tip(
                    "Tired voices are stiffer voices",
                    "Fatigue reduces fine motor control and raises the effort needed for the same result. Range, agility and pitch accuracy all degrade before you consciously notice you are tired.",
                ),
                Tip(
                    "Your voice sits lower in the morning",
                    "Fluid redistributes overnight, so the folds are slightly swollen when you wake. Low notes come easily; high notes do not. Do not judge your range before you are properly warm.",
                ),
                Tip(
                    "Do not do demanding work on short sleep",
                    "Warm-ups and gentle SOVT are fine on a bad night. Range extension and chest strength are not — that is when people injure themselves.",
                ),
                Tip(
                    "Reflux is a sleep problem too",
                    "Eating within about three hours of lying down makes night-time reflux more likely, and laryngeal reflux is a common cause of a hoarse morning voice and a sensation of needing to clear your throat.",
                ),
            ],
        ),

        TipSection(
            "Gargling and throat care",
            "What helps, what is neutral, and what to stop doing.",
            [
                Tip(
                    "Warm salt water gargling",
                    "Roughly half a teaspoon of salt in a glass of warm water. It soothes an irritated pharynx and can help with a sore throat. Useful and harmless.",
                    "It does not reach your vocal folds and it will not change your voice. It makes you more comfortable, which is worth something on its own.",
                ),
                Tip(
                    "Do not gargle with alcohol-based mouthwash before singing",
                    "It dries exactly the tissue you want moist.",
                ),
                Tip(
                    "Stop clearing your throat",
                    "Throat clearing slams the vocal folds together hard. It causes the irritation that makes you want to clear your throat again. Swallow, sip water, or do a gentle silent 'h' instead.",
                ),
                Tip(
                    "Coughing is the same problem, louder",
                    "You cannot always avoid it, but suppress the habitual ones. A dry habitual cough is worth breaking deliberately.",
                ),
                Tip(
                    "Menthol and strong lozenges can backfire",
                    "They numb the throat, which removes the feedback telling you to stop. Numb is not healed. If you need one to get through a session, do not do the session.",
                ),
            ],
        ),

        TipSection(
            "Diet",
            "Less dramatic than the internet suggests, but a few things are real.",
            [
                Tip(
                    "Dairy does not produce mucus",
                    "It has been tested and it does not. What it does do for some people is thicken saliva slightly, which feels like mucus. If it bothers you, skip it before singing. If it does not, ignore the advice.",
                ),
                Tip(
                    "Reflux triggers are worth knowing",
                    "Very spicy food, high-fat meals, chocolate, mint, tomato, citrus, carbonation and alcohol are common triggers. Reflux is one of the more frequent causes of persistent hoarseness in singers.",
                ),
                Tip(
                    "Do not sing on a very full stomach",
                    "It restricts the diaphragm and makes reflux more likely. Leave an hour or two.",
                ),
                Tip(
                    "Nothing you eat will give you range",
                    "There is no food, tea, oil or supplement that expands range or improves tone. Anything sold on that promise is selling you a feeling.",
                ),
            ],
        ),

        TipSection(
            "Practice load",
            "How much, how often, and when to stop.",
            [
                Tip(
                    "Frequency beats duration",
                    "Twenty focused minutes daily builds more than two hours twice a week, and it is much less likely to hurt you. The voice is muscle and tissue; it adapts to regular moderate load.",
                ),
                Tip(
                    "Always warm up, always cool down",
                    "Five minutes of SOVT before, two or three minutes of gentle descending hums after. Skipping the cool-down after heavy chest or range work is why voices feel rough the next morning.",
                ),
                Tip(
                    "Take a real break every twenty to thirty minutes",
                    "Complete vocal rest, not quiet talking. Talking through your break is still using your voice.",
                ),
                Tip(
                    "Order matters within a session",
                    "SOVT, then breath, then technical work at the middle of your range, then the demanding register or range work, then cool-down. Never start with the hard thing.",
                ),
                Tip(
                    "One demanding exercise per session",
                    "Bratty calls, octave 'nay' repeats and range climbs are each a full workout. Chaining them is how a good session becomes a bad week.",
                ),
            ],
        ),

        TipSection(
            "Warning signs",
            "The difference between working hard and doing damage.",
            [
                Tip(
                    "Stop immediately for any of these",
                    "Pain while singing. Scratchiness or a raw feeling. A sudden loss of the top of your range. Your voice cutting out on notes that were fine yesterday. A tickle that makes you cough every time you sing.",
                ),
                Tip(
                    "Hoarseness lasting more than two weeks needs a doctor",
                    "Not a teacher, not a forum, not more practice — an ENT or laryngologist. Persistent hoarseness is the standard threshold for getting your larynx looked at, and most things found early are easily managed.",
                ),
                Tip(
                    "Effort is not the same as strain",
                    "Effort is work you can sustain and recover from. Strain is squeezing, a locked feeling, or pain. Learning to tell them apart is a skill, and until you have it, err toward stopping early.",
                ),
                Tip(
                    "Do not sing through a laryngitis",
                    "Singing on inflamed folds is the classic route to a lasting injury. If your speaking voice is hoarse from illness, rest it. The days you lose are far fewer than the days an injury costs.",
                ),
            ],
        ),

        TipSection(
            "Carnatic practice specifics",
            "Habits particular to this tradition.",
            [
                Tip(
                    "Always practise against a drone",
                    "Shruti is not something you check at the start and then assume. The tanpura is a continuous reference and singing without it trains you to drift.",
                ),
                Tip(
                    "Keep the tala with your hand, physically",
                    "Counting in your head is not the same skill. The syllabus is explicit: tala should be felt rather than mechanically counted, and that comes from doing it with the body.",
                ),
                Tip(
                    "Swara syllables first, akaram later",
                    "Sing the names until they are secure, then the same pattern on 'aa'. Akaram exposes pitch accuracy that the syllables were propping up.",
                ),
                Tip(
                    "Do not chase speed",
                    "Perfect pitch matters more than speed, and third speed must not become a blur of approximate pitches. The pitch graph makes this argument for you.",
                ),
                Tip(
                    "Gamaka is learned by ear, not from a description",
                    "Kampita, jaaru, nokku and the rest are sounds before they are words. Learn each from a specific raga phrase from a teacher or an authoritative recording, and practise slowly enough to hear the pitch path.",
                ),
                Tip(
                    "This app is not a teacher",
                    "It can tell you that you were fifteen cents flat. It cannot tell you that your Ri is technically in tune but wrong for the raga. For gamaka, raga phraseology and voice production, you need a person.",
                ),
            ],
        ),

        TipSection(
            "Environment",
            "Small things that change how your practice goes.",
            [
                Tip(
                    "Humidity",
                    "Dry air dries the airway. If you live somewhere dry or run heating or air conditioning, a humidifier in the room where you sleep does more for your voice than most things you can buy.",
                ),
                Tip(
                    "Do not practise in a very reverberant room",
                    "A tiled bathroom flatters everything and teaches you nothing. It also encourages you to sing quieter than you think, which distorts your sense of effort.",
                ),
                Tip(
                    "Stand if you can",
                    "Sitting slumped restricts the ribs. If you sit, sit forward on the chair with both feet down.",
                ),
                Tip(
                    "Phone placement for accurate readings",
                    "About an arm's length away, off to the side rather than directly in front of your mouth. Direct breath blasts on the microphone cause spurious low-frequency readings.",
                ),
            ],
        ),
    ];
