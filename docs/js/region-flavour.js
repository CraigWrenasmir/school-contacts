// region-flavour.js — psychogeographic quips for the school contact search
// Lookup order: exact named place → partial named place → suburb keyword → state default

(function () {

  const NAMED = {
    // ── NSW ──────────────────────────────────────────────────────────────────
    "sydney": [
      "Sydney: where the harbour is beautiful, the property prices are spiritual, and everyone's from somewhere else.",
      "Population: ambitious. Traffic: also ambitious. Schools: quietly excellent.",
      "Eight million people working hard to pretend it's still a small town."
    ],
    "newcastle": [
      "Coal country turned culture hub — the Bathers' Way is worth every step.",
      "Built on the Hunter, shaped by steel, running on flat whites these days.",
      "Novocastrians will tell you it's the best city in Australia. They're not entirely wrong."
    ],
    "wollongong": [
      "Sea cliff, escarpment, steelworks — the 'Gong packs a lot into a small strip.",
      "Where the Illawarra escarpment drops straight into the Tasman. Dramatic commutes.",
      "University town, surf town, steel town — all at once, somehow."
    ],
    "byron bay": [
      "The easternmost point of mainland Australia, and it absolutely knows it.",
      "Byron: where the lighthouse is free but the parking is not.",
      "Dolphins, drummers, and $24 açaí bowls. The schools are grounded."
    ],
    "coffs harbour": [
      "The Big Banana keeps watch. There is more to Coffs than bananas, but the banana is hard to ignore.",
      "Halfway between Sydney and Brisbane — a very pleasant halfway.",
      "The Solitary Islands Marine Park is right there. School excursions must be excellent."
    ],
    "port macquarie": [
      "More sunny days than almost anywhere on the east coast. The Koala Hospital agrees.",
      "Where the Hastings River meets the Tasman. Quietly, consistently perfect.",
      "The Koala Hospital is the real tourism drawcard here. Also the beach. Also the river."
    ],
    "tamworth": [
      "Country music capital of Australia. The Golden Guitar is genuinely large.",
      "Tamworth takes its country music seriously. The rest of Australia eventually does too.",
      "New England tablelands — proper seasons, proper country, proper schools."
    ],
    "dubbo": [
      "The Taronga Western Plains Zoo is worth the drive. So is everything else out here.",
      "Central NSW: where the wheatbelt begins and the skies open all the way up.",
      "Dubbo is bigger than people from Sydney expect. Most things out here are."
    ],
    "bathurst": [
      "Mount Panorama is a real public road for 361 days of the year. Wild.",
      "Gold rush history, motorsport present. Bathurst contains multitudes.",
      "The oldest inland city in Australia. It is proud of this."
    ],
    "orange": [
      "Cold climate wine country and apple orchards. Orange deserves considerably more credit.",
      "Named after a prince, grows apples, produces exceptional pinot noir. Go figure.",
      "Spring blossoms in Orange are genuinely spectacular. Ask anyone who's been."
    ],
    "broken hill": [
      "Living National Heritage — genuinely, officially, on the list.",
      "The Silver City on the edge of the outback. The light out here is unlike anywhere else.",
      "Artists have been coming to Broken Hill for the light for over a century. It shows."
    ],
    "albury": [
      "Albury-Wodonga: where NSW and Victoria shake hands across the Murray.",
      "The Murray River divides two states here. The schools serve both.",
      "Gateway to the Alps, gateway to the Riverina. Albury is a hinge point."
    ],
    "wagga wagga": [
      "Wagga Wagga means 'place of many crows'. The crows are still very much there.",
      "The largest inland city in NSW — and Wagga earns the title comfortably.",
      "The Murrumbidgee runs through it. The Riverina stretches out in all directions."
    ],
    "goulburn": [
      "The Big Merino is unavoidable. The Southern Tablelands are quietly exceptional.",
      "Goulburn sits between the coast and the capital. A very useful position.",
      "Cold winters, warm community. The wool industry built this place and it shows."
    ],
    "bowral": [
      "Tulip festival, cricket legend, cool southerly change. Bowral ticks many boxes.",
      "The Southern Highlands: where Sydneysiders go to pretend they live rurally.",
      "Sir Donald Bradman was born nearby. The whole region is aware of this."
    ],
    "nowra": [
      "The Shoalhaven: river, sea, national park. Nowra holds it all together.",
      "Kangaroo Valley is just up the escarpment. Worth every minute of the drive.",
      "Where the Shoalhaven River bends toward the sea. Beautiful country."
    ],
    "kiama": [
      "The blowhole is real and it delivers. Kiama earns its reputation.",
      "Sea change country — rolling green hills meeting the Tasman.",
      "South Coast charm at its most concentrated. The schools are part of the fabric."
    ],

    // ── VIC ──────────────────────────────────────────────────────────────────
    "melbourne": [
      "Four seasons in one day — pack accordingly, always.",
      "The coffee is excellent, the laneways are hidden, and yes, the AFL matters enormously.",
      "Flat whites, street art, trams, and a very strong opinion about everything."
    ],
    "geelong": [
      "Waterfront, wool history, Cats football. That is the Holy Trinity here.",
      "Not Melbourne. Geelong is entirely comfortable with this distinction.",
      "The Bellarine and Surf Coast are right there. Geelong wins the geography."
    ],
    "ballarat": [
      "Eureka Stockade territory. The rebellion happened here and it genuinely mattered.",
      "Sovereign Hill is great fun. The winters are bracing. The history is everywhere.",
      "Gold rush grandeur, intact. Federation architecture on every second street."
    ],
    "bendigo": [
      "Chinese heritage, gold rush history, an excellent art gallery. Bendigo delivers.",
      "The Golden Dragon Museum tells a story the coast cities tend to forget.",
      "Underground mine tours, beautiful architecture, and a superb regional gallery."
    ],
    "shepparton": [
      "The food bowl of Victoria — stone fruit, tomatoes, dairy. Shepparton feeds people.",
      "Greater Shepparton: where the Goulburn and Broken Rivers meet the orchard country.",
      "Multicultural, agricultural, understated. Shepparton is doing real work."
    ],
    "warrnambool": [
      "Southern right whales calve just offshore at Logan's Beach. Every year, on schedule.",
      "The Great Ocean Road ends — or begins — here. Either way, well done.",
      "Whale watching, cheese, shipwreck coast. Warrnambool is genuinely special."
    ],
    "mildura": [
      "Where the Murray bends and the sun does not stop. Mildura runs on citrus and river light.",
      "Semi-arid, sun-drenched, and sitting on one of the world's great river systems.",
      "Sunraysia: the name says everything about the light and the fruit."
    ],

    // ── QLD ──────────────────────────────────────────────────────────────────
    "brisbane": [
      "Sub-tropical and proud of it. The river bends a lot, and so does Brisbane's self-image.",
      "Warm enough to be outdoors all year, civilised enough to not need to be.",
      "The river city: Brisbane has figured out how to be a big city without losing the plot."
    ],
    "gold coast": [
      "High-rises on the shore, theme parks inland, a beach for every mood.",
      "Australia's holiday capital — and yet, actual people live and work here too.",
      "The surf is consistent. The skyline keeps going up. The schools are busy."
    ],
    "sunshine coast": [
      "The name is not false advertising. Not even slightly.",
      "Calmer than the Gold Coast, sunnier than almost everywhere else.",
      "Hinterland on one side, Coral Sea on the other. Not a bad commute at all."
    ],
    "cairns": [
      "Gateway to the Great Barrier Reef. Do not skip the reef.",
      "Tropical, humid, and full of things that sting — and yet, genuinely magical.",
      "You are at the edge of the Wet Tropics. Everything here grows very fast."
    ],
    "townsville": [
      "Sunny roughly 300 days a year. Townsville will remind you of this constantly.",
      "Castle Hill watches over the whole city. It is a genuinely good hill.",
      "The NRL is serious business here. So is the magpie swooping season."
    ],
    "toowoomba": [
      "Garden City on the edge of the Darling Downs. The jacarandas are locally famous.",
      "On the Great Dividing Range with a view over the Lockyer Valley. Earned.",
      "Toowoomba has a surprising number of gardens and they are all worth visiting."
    ],
    "rockhampton": [
      "Beef capital of Australia. Rocky takes its cattle seriously — as it should.",
      "The Tropic of Capricorn runs right through town. A solid geographic credential.",
      "Koorana Crocodile Farm and excellent botanic gardens. Rocky has genuine range."
    ],
    "mackay": [
      "Sugar cane capital of Australia. The Whitsundays are just up the coast.",
      "Where the Pioneer River meets the Coral Sea and the cane trains run at night.",
      "The cane fields at harvest time smell like nothing else on earth."
    ],
    "bundaberg": [
      "Ginger beer and rum — Bundaberg's twin gifts to a grateful nation.",
      "The Coral Coast starts here. Mon Repos turtle nesting is extraordinary to witness.",
      "Bert Hinkler was from here. The first solo flight from England to Australia. Big deal."
    ],
    "hervey bay": [
      "Whale watching capital of Australia — from July to November, it earns the title.",
      "K'gari (Fraser Island) is just across the water. It is exactly as good as it sounds.",
      "The bay is exceptionally calm. The humpback whales appreciate this very much."
    ],
    "noosa": [
      "National park, long beach, excellent restaurants. Noosa has refined the formula.",
      "The headland national park ends right where the surf beach begins. Ridiculous.",
      "Noosa: where the Everglades meet the Coral Sea and the coffee is very good."
    ],

    // ── WA ───────────────────────────────────────────────────────────────────
    "perth": [
      "The most isolated major city on Earth — and somehow completely fine with it.",
      "Closer to Singapore than to Sydney. Perth does things its own way, cheerfully.",
      "Indian Ocean on one side, outback on the other. Not a bad position at all."
    ],
    "fremantle": [
      "The port, the prison, the cappuccino strip. Freo does not do things by halves.",
      "Maritime history, live music, a very good farmers market. Fremantle delivers.",
      "Where the Swan River meets the Indian Ocean and the coffee has been excellent since 1982."
    ],
    "broome": [
      "Cable Beach sunsets are genuinely one of Australia's best things. Full stop.",
      "Pearling history, red pindan cliffs, turquoise water — Broome earns every bit of hype.",
      "The Kimberley starts here. Buckle up and bring sunscreen."
    ],
    "kalgoorlie": [
      "The Super Pit is visible from space. The history beneath it is just as large.",
      "Gold rush energy, still going strong after 130 years.",
      "Dust, gold, and the kind of pub that has genuinely seen everything."
    ],
    "bunbury": [
      "The South West's main city — dolphins in the harbour, good wine up the road.",
      "Between Perth and the Margaret River region. Bunbury is comfortable here.",
      "The Leschenault Inlet is right there. Southwest WA is underrated by everyone."
    ],
    "albany": [
      "The southernmost city on mainland WA — the Southern Ocean starts here.",
      "Whaling history, wind, wildflowers. Albany is not for the faint-hearted.",
      "The Gap and Natural Bridge are just down the coast. Terrifying and beautiful."
    ],
    "margaret river": [
      "World-class wine, world-class surf, ancient karri forest. Not bad for one region.",
      "The cape-to-cape walk connects it all. Margaret River earns its reputation.",
      "Cabernet and chardonnay and caves and surf. Margaret River multitasks well."
    ],

    // ── SA ───────────────────────────────────────────────────────────────────
    "adelaide": [
      "More festivals per capita than anywhere else in Australia. Adelaide means it.",
      "The city that essentially invented the long weekend and has never looked back.",
      "Three churches, twelve pubs, world-class wine country thirty minutes away."
    ],
    "mount gambier": [
      "The Blue Lake turns turquoise every summer. This is not a rumour — it just does.",
      "A volcanic city on the SA-VIC border with a remarkable geological history.",
      "The Umpherston Sinkhole garden is one of Australia's strangest beautiful things."
    ],
    "port augusta": [
      "The Crossroads of Australia — north, south, east and west genuinely all meet here.",
      "Gateway to the Flinders Ranges. The ranges are worth every single kilometre.",
      "Where the Spencer Gulf ends and the outback begins. A significant threshold."
    ],
    "whyalla": [
      "Steel city of the north — and home to the world's largest cuttlefish spawning aggregation.",
      "The giant cuttlefish gather here every winter. Divers come from everywhere to see it.",
      "Whyalla makes steel and hosts cuttlefish. Not many cities can say that."
    ],
    "victor harbor": [
      "The Granite Island causeway tram is run by Clydesdale horses. That is real.",
      "Southern Encounter country — whale nursery, granite island, a horse-drawn tram.",
      "Southern right whales come here to nurse their calves. Worth the drive from Adelaide."
    ],
    "barossa": [
      "The Barossa Valley: where Australian wine got its confidence and never lost it.",
      "Shiraz, riesling, Luthern heritage and excellent smallgoods. The Barossa formula.",
      "Old vines, old families, very good wine. The Barossa has been doing this since 1842."
    ],

    // ── TAS ──────────────────────────────────────────────────────────────────
    "hobart": [
      "The mountain keeps an eye on everything. It has seen quite a lot.",
      "MONA changed things. The cool change off the Southern Ocean was already there.",
      "The world's second-deepest natural harbour, and Hobart is not shy about mentioning it."
    ],
    "launceston": [
      "Cataract Gorge is a ten-minute walk from the CBD. Genuinely ridiculous, in the best way.",
      "The Tamar Valley wine region is right on the doorstep. Easy access.",
      "Second city of Tasmania — and not remotely second-rate in any respect."
    ],
    "devonport": [
      "Where you arrive in Tasmania by sea. The Spirit of Tasmania docks here. First impressions: good.",
      "The Spirit comes and goes. Devonport keeps going either way.",
      "Gateway to the north-west coast — a very good coast."
    ],
    "burnie": [
      "Reinvented: from paper mill town to creative industries hub. Burnie worked at it.",
      "The Makers' Workshop in Burnie is genuinely excellent. The north-west coast rewards curiosity.",
      "Industrial past, creative present. Burnie is mid-transformation and it's interesting."
    ],

    // ── NT ───────────────────────────────────────────────────────────────────
    "darwin": [
      "Wet or dry — Darwin only has two seasons and is deeply unbothered by both.",
      "The Top End lives by its own rules. The saltwater crocodiles have agreed to this arrangement.",
      "If you have never watched a storm roll in over the Timor Sea, you are missing something significant."
    ],
    "alice springs": [
      "The Red Centre: where the distances are honest and the stars are genuinely astonishing.",
      "Equidistant from everywhere and somehow the heart of everything.",
      "A town that knows how remote it is, and has made a very good peace with it."
    ],
    "katherine": [
      "Katherine Gorge — fourteen gorges carved over billions of years. Worth every step.",
      "The Katherine River runs through it. The Nitmiluk gorges are just upstream.",
      "Top End gateway to the Kimberley. Katherine sits at a significant crossroads."
    ],
    "tennant creek": [
      "Barkly Tablelands country — flat, vast, and full of a history that is still being told.",
      "Halfway between Darwin and Alice Springs on the Stuart Highway. A necessary pause.",
      "Battery Hill mining museum tells the story of the gold rush that built this town."
    ],

    // ── ACT ──────────────────────────────────────────────────────────────────
    "canberra": [
      "A city purpose-built for democracy. Whether that worked is an ongoing matter of debate.",
      "More roundabouts per person than anywhere in Australia. Make of that what you will.",
      "The bush capital — where the galahs reliably outnumber the staffers. Probably."
    ],
    "belconnen": [
      "The northern hub of Canberra — lake, mall, university, very reliable public transport.",
      "Belconnen: Canberra doing its suburbs the way only Canberra does suburbs.",
      "Lake Ginninderra is right there. The ACT takes its lakes seriously."
    ],
    "woden": [
      "The southern hub, where the public service lives and the jacarandas bloom.",
      "Woden Valley: a planned suburb that somehow got very comfortable.",
      "Government departments and good coffee. Woden has both sorted."
    ],
    "tuggeranong": [
      "The deep south of Canberra — the mountains are close and the pace is its own.",
      "Tuggeranong: further from the centre, closer to the Brindabellas.",
      "Lake Tuggeranong reflects the Brindabella ranges on a good morning. Worth it."
    ],

    // ── Shared key places ─────────────────────────────────────────────────────
    "manly": [
      "Ferry ride from the city, world away in atmosphere. Manly earns its reputation.",
      "The corso, the beach, the ferry. Manly has had this formula working for 150 years.",
      "Surf on one side, harbour on the other. Manly is not subtle about its advantages."
    ],
    "bondi": [
      "The most famous beach in Australia, aware of this at all times.",
      "Bondi: where the icebergs pool hangs over the Tasman and everyone looks great.",
      "More known internationally than locally. Bondi contains multitudes."
    ],
    "cronulla": [
      "The only beach in Sydney accessible by train. A significant quality of life advantage.",
      "Cronulla: southern Sydney's piece of the coastline, and it makes the most of it.",
      "The Sharks, the beach, the sandbars. Cronulla is very much its own place."
    ],
    "penrith": [
      "The Blue Mountains begin just up the road. Penrith has always known this.",
      "Western Sydney hub — Penrith is bigger and better than its reputation suggests.",
      "The Nepean River bends around it. Panthers. Mountains. Penrith holds the west together."
    ],
    "parramatta": [
      "The second CBD — older than the CBD, arguably more historically significant.",
      "Parramatta: where the colony actually started, before Sydney got ahead of itself.",
      "On the Parramatta River, at the heart of western Sydney. The centre has shifted here."
    ],
    "lismore": [
      "The Northern Rivers: creative, resilient, flood-affected, and remarkable.",
      "Lismore picks itself up. That's the story — and it keeps being the story.",
      "Rainbow Region hub. The hinterland stretches in every direction."
    ],
    "armidale": [
      "New England tablelands at their most elevated — geographically and intellectually.",
      "A university city in the high country. Armidale runs cool and thinks hard.",
      "Two cathedrals, a national park, a university. Armidale overachieves at altitude."
    ]
  };

  // ── Keyword categories ──────────────────────────────────────────────────────
  const KEYWORDS = [
    {
      terms: ["beach", "bay", "cove", "shore", "surf", "coast", "harbour", "harbor", "inlet", "reef", "heads", "point", "cape", "spit", "dunes"],
      quips: [
        "Coastal schools — the salt air does something good for concentration.",
        "Schools near the sea tend to have a certain outlook. Literally.",
        "Between the ocean and everything else. Not a bad place to be learning."
      ]
    },
    {
      terms: ["mountain", "mount", "ridge", "heights", "alpine", "highland", "plateau", "peak", "bluff", "escarpment", "ranges", "tablelands"],
      quips: [
        "Up in the hills — the views probably make the commute worthwhile.",
        "Elevated country. The air is different up here and so is the perspective.",
        "Mountain communities tend to do things their own way. Usually the right way."
      ]
    },
    {
      terms: ["valley", "creek", "gully", "glen", "brook", "riverside", "river"],
      quips: [
        "River country — schools have been sitting on these banks for a long time.",
        "Down in the valley where things grow well. Schools included.",
        "Creek names tell you something about the country. So does the school roll."
      ]
    },
    {
      terms: ["plains", "downs", "flat", "station", "fields", "meadow", "tablelands"],
      quips: [
        "Real country — the kind of place and the kind of school that shapes people.",
        "Agricultural heartland. These schools are doing genuinely important work.",
        "Out where the paddocks go to the horizon. Room to think."
      ]
    },
    {
      terms: ["forest", "grove", "gardens", "park", "bush", "scrub", "heath", "reserve", "wood", "pines", "gully"],
      quips: [
        "Good tree cover around here. Good schools too.",
        "The bush is close — that is rarely a bad thing for a school community.",
        "Green and leafy. The best kind of suburb."
      ]
    },
    {
      terms: ["island", "isle"],
      quips: [
        "Island schools — a community with clear edges and tight bonds.",
        "Everything is a little more considered when you're surrounded by water.",
        "Island life builds a particular kind of independence. So does island schooling."
      ]
    },
    {
      terms: ["lakes", "lake", "lagoon", "wetlands", "swamp"],
      quips: [
        "Lakeside — still water, good light, calm surroundings for learning.",
        "Water draws communities together. Lakes do it particularly well.",
        "Some of the best school excursions start at a lake. Just a theory."
      ]
    },
    {
      terms: ["heights", "hill", "hills", "knoll", "rise", "view"],
      quips: [
        "On the high ground — good views, good perspective.",
        "Hill suburbs have a certain energy. Something about the elevation.",
        "Up on the rise where the breeze gets through. Good country."
      ]
    }
  ];

  // ── State defaults ──────────────────────────────────────────────────────────
  const STATE_DEFAULTS = {
    nsw: [
      "The Premier State — big claims, but the evidence across 312 school districts is pretty compelling.",
      "New South Wales contains multitudes: coast, escarpment, plains, outback. So does its school network.",
      "1788 and counting. NSW has been building schools almost as long as it has been building everything else."
    ],
    vic: [
      "Victoria: small state, long memory, excellent coffee, very strong opinions about football.",
      "The Garden State knows how to pack an enormous amount into a small footprint.",
      "Sport, culture, arts, and a passionate attachment to the AFL. Victoria delivers."
    ],
    qld: [
      "Beautiful one day, perfect the next. Queensland's old tourism line was honest.",
      "The Sunshine State: actual sun, actual warmth, actual enthusiasm for the outdoors.",
      "Queensland is bigger than most countries. The school network reflects this faithfully."
    ],
    wa: [
      "One third of the continent, going its own way since 1829 and comfortable about it.",
      "Western Australia: where extraordinary mining history meets extraordinary coastline.",
      "The west does things differently. It is usually worth the distance to find out."
    ],
    sa: [
      "The Festival State — Adelaide hosts more festivals than you would reasonably expect.",
      "South Australia: wine regions, the Flinders Ranges, and a remarkably liveable capital.",
      "Settled by free colonists. South Australia is still quietly proud of the distinction."
    ],
    tas: [
      "The island state. Clean air, cold water, extraordinary wilderness, and very good whisky.",
      "Tasmania: where the Roaring Forties blow in off the Southern Ocean and MONA happened.",
      "Forty percent wilderness, world-class food scene, a world-class contemporary art museum. Tasmania overachieves."
    ],
    act: [
      "The purpose-built capital. Canberra is weirder and better than its national reputation.",
      "More public servants, more great museums, more cherry blossoms per kilometre than anywhere.",
      "Canberra: the bush capital that grew into something genuinely interesting and refuses to stop."
    ],
    nt: [
      "The Territory does things differently. Distances, landscapes, and timescales are all bigger here.",
      "Red dirt, monsoon skies, and a cultural depth that takes time to properly appreciate.",
      "The Northern Territory: where Australia's oldest continuing stories are still being told."
    ]
  };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  window.getRegionFlavour = function (label, stateCode) {
    // label is e.g. "Suburb Newcastle" or "Postcode 2300"
    const suburb = label.startsWith("Suburb ")
      ? label.slice(7).toLowerCase().trim()
      : "";

    if (suburb) {
      // 1. Exact named place match
      if (NAMED[suburb]) return pick(NAMED[suburb]);

      // 2. Named place where suburb name contains the key
      //    (e.g. "south darwin" → darwin, "alice springs west" → alice springs)
      for (const key of Object.keys(NAMED)) {
        if (suburb.includes(key)) return pick(NAMED[key]);
      }

      // 3. Keyword match — check individual words in the suburb name
      const words = suburb.split(/[\s\-]+/);
      for (const { terms, quips } of KEYWORDS) {
        if (words.some(w => terms.includes(w))) return pick(quips);
      }
    }

    // 4. State default
    const defaults = STATE_DEFAULTS[stateCode] || STATE_DEFAULTS["nsw"];
    return pick(defaults);
  };

})();
