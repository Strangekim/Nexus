"""6-tier 오디오 분류 체계 정의"""

TAXONOMY = {
    "Dialogue_VO": {
        "display": "Dialogue / VO",
        "mid": {
            "Dialogue": [],
            "Narration_VO": [],
            "Crowd_Dialogue": [],
            "Announcement": [],
            "Voiceover": [],
            "Synthetic": [],
            "Human": [],
        },
    },
    "Music": {
        "display": "Music",
        "mid": {
            "BGM": ["Cinematic_Score", "Lo_fi_Chill", "Electronic", "Orchestral", "Acoustic", "Rock", "Jazz", "Hip_Hop", "World"],
            "Stinger": ["Hit_Stinger", "Reveal_Stinger", "Transition_Stinger"],
            "Jingle": ["Intro_Jingle", "Outro_Jingle", "Notification_Jingle"],
            "Drone_Pad": ["Ambient_Pad", "Dark_Drone", "Bright_Pad"],
            "Score": ["Orchestral", "Electronic", "Hybrid"],
            "Percussion": ["Acoustic", "Electronic", "World"],
        },
    },
    "Ambience": {
        "display": "Ambience",
        "mid": {
            "Nature": ["Forest", "Ocean", "River", "Wind", "Birds", "Insects", "Rain_Forest"],
            "Urban": ["City_Traffic", "Street", "Construction", "Market", "Subway"],
            "Interior": ["Office", "Restaurant", "Hospital", "School", "Home", "Mall"],
            "Exterior": ["Park", "Parking_Lot", "Airport", "Stadium", "Harbor"],
            "Weather": ["Rain", "Thunder", "Wind", "Snow", "Hail"],
            "Special": ["Sci_Fi", "Fantasy", "Horror", "Underwater"],
            "Designed": ["Abstract", "Processed"],
            "Mechanical": ["Factory", "Engine", "HVAC"],
            "Human": ["Crowd", "Walla", "Children"],
        },
    },
    "Foley": {
        "display": "Foley",
        "mid": {
            "Footsteps": ["Concrete", "Wood", "Gravel", "Grass", "Metal", "Carpet", "Tile", "Snow", "Mud", "Sand"],
            "Cloth_Rustle": ["Jacket", "Dress", "Denim", "Leather"],
            "Body_movement": ["Jump", "Fall", "Crawl", "Roll"],
            "Hand_Touch": ["Grab", "Release", "Tap", "Scratch"],
            "Object_handling": ["Cup_Glass", "Paper", "Plastic", "Metal_Object", "Wood_Object"],
            "Door_Window": ["Open", "Close", "Knock", "Creak", "Slide"],
            "Furniture": ["Chair", "Drawer", "Cabinet", "Table"],
            "Eating_Drinking": ["Chew", "Sip", "Pour", "Swallow"],
            "Writing": ["Pen", "Pencil", "Keyboard", "Chalk"],
            "Liquid": ["Pour", "Splash", "Drip", "Bubble"],
            "Material": ["Glass", "Metal", "Wood", "Fabric", "Paper"],
            "Movement": ["Slide", "Drag", "Roll", "Spin"],
            "Object_Interaction": ["Stack", "Drop", "Catch", "Throw"],
            "Body": ["Clap", "Snap", "Slap", "Stomp"],
            "Misc_Foley": [],
        },
    },
    "Hard_SFX": {
        "display": "Hard SFX",
        "mid": {
            "Impact_Hit": ["Punch", "Kick", "Slam", "Thud", "Metal_Hit", "Wood_Hit"],
            "Crash_Break": ["Glass_Shatter", "Wood_Break", "Metal_Crash", "Ceramic_Break"],
            "Explosion": ["Small", "Medium", "Large", "Distant", "Debris"],
            "Gunshot_Weapon": ["Pistol", "Rifle", "Shotgun", "Laser", "Sword", "Bow"],
            "Vehicle": ["Car", "Motorcycle", "Truck", "Helicopter", "Airplane", "Boat"],
            "Fire": ["Campfire", "Torch", "Inferno", "Match"],
            "Water_impact": ["Splash", "Drip", "Underwater", "Wave"],
            "Mechanical": ["Gear", "Lock", "Switch", "Motor", "Hydraulic"],
            "Electrical": ["Spark", "Buzz", "Zap", "Short_Circuit"],
            "Animal": ["Dog", "Cat", "Bird", "Horse", "Insect", "Monster"],
            "Human_nonspeech": ["Breath", "Cough", "Scream", "Laugh", "Grunt", "Gasp"],
            "Impact": ["Generic", "Body", "Object"],
            "Weapon": ["Sword", "Shield", "Bow", "Magic"],
            "Whoosh": ["Fast", "Slow", "Heavy", "Light"],
            "UI": ["Click", "Beep", "Notification", "Error"],
            "Cartoon": ["Boing", "Splat", "Pop", "Squeak"],
            "Electronic": ["Glitch", "Digital", "Synth"],
            "Construction": ["Hammer", "Drill", "Saw"],
            "Sports": ["Ball", "Whistle", "Crowd"],
            "General": [],
        },
    },
    "Cinematic": {
        "display": "Cinematic",
        "mid": {
            "Riser_Sweller": ["Short_Riser", "Long_Riser", "Reverse_Riser", "Swell"],
            "Hit_Impact": ["Cinematic_Hit", "Sub_Hit", "Orchestral_Hit", "Hybrid_Hit"],
            "Whoosh_Transition": ["Fast_Whoosh", "Slow_Whoosh", "Flyby", "Sweep"],
            "Drone_Texture": ["Dark_Drone", "Light_Texture", "Evolving_Pad", "Granular"],
            "UI_Notification": ["Button_Click", "Alert", "Confirm", "Cancel", "Hover"],
            "Stab_Sting": ["Orchestra_Stab", "Synth_Sting", "Brass_Stab"],
            "Dark": ["Horror", "Suspense", "Eerie"],
            "Fantasy": ["Magic", "Sparkle", "Enchant"],
            "Horror": ["Scare", "Creep", "Jump_Scare"],
            "Sci_Fi": ["Laser", "Hologram", "Warp"],
            "Tension": ["Build", "Sustain", "Release"],
            "Texture": ["Organic", "Synthetic", "Metallic"],
            "Transition": ["Cut", "Fade", "Swipe"],
            "Impact": ["Boom", "Thud", "Crash"],
        },
    },
}

# 유효한 major 목록
VALID_MAJORS = set(TAXONOMY.keys())

# major → mid 매핑
VALID_MIDS = {}
for major, data in TAXONOMY.items():
    VALID_MIDS[major] = set(data["mid"].keys())

# major → mid → sub 매핑
VALID_SUBS = {}
for major, data in TAXONOMY.items():
    VALID_SUBS[major] = {}
    for mid, subs in data["mid"].items():
        VALID_SUBS[major][mid] = set(subs) if subs else set()


def validate_classification(major: str, mid: str, sub: str | None) -> tuple[str, str, str | None]:
    """분류 결과를 검증하고 유효하지 않으면 가장 가까운 값으로 매핑"""
    if major not in VALID_MAJORS:
        return "Hard_SFX", "General", None

    if mid not in VALID_MIDS.get(major, set()):
        # mid가 유효하지 않으면 첫 번째 mid로 폴백
        fallback_mid = list(TAXONOMY[major]["mid"].keys())[0]
        return major, fallback_mid, None

    if sub and major in VALID_SUBS and mid in VALID_SUBS[major]:
        if sub not in VALID_SUBS[major][mid]:
            return major, mid, None

    return major, mid, sub
