"""오디오 분류 체계 (v2.2)

원천 데이터: shared/audio-taxonomy.json
이 파일은 JSON을 로드하여 검증/정규화 로직을 제공한다.
"""

import json
from pathlib import Path

# ── JSON 원천 데이터 로드 ──
_TAXONOMY_PATH = Path(__file__).resolve().parents[2] / "shared" / "audio-taxonomy.json"
_raw = json.loads(_TAXONOMY_PATH.read_text(encoding="utf-8"))

# Python용 dict 변환: { major_key: { "display": label, "mid": { mid: [subs] } } }
TAXONOMY: dict[str, dict] = {}
for cat in _raw["categories"]:
    TAXONOMY[cat["key"]] = {
        "display": cat["label"],
        "mid": cat["mids"],
    }

# ── 유효값 매핑 ──
VALID_MAJORS = set(TAXONOMY.keys())

VALID_MIDS: dict[str, set[str]] = {}
for major, data in TAXONOMY.items():
    VALID_MIDS[major] = set(data["mid"].keys())

VALID_SUBS: dict[str, dict[str, set[str]]] = {}
for major, data in TAXONOMY.items():
    VALID_SUBS[major] = {}
    for mid, subs in data["mid"].items():
        VALID_SUBS[major][mid] = set(subs) if subs else set()

# ── 대소문자 정규화 룩업 ──
_MAJOR_LOOKUP: dict[str, str] = {m.lower(): m for m in VALID_MAJORS}

_MID_LOOKUP: dict[str, dict[str, str]] = {}
for major, data in TAXONOMY.items():
    _MID_LOOKUP[major.lower()] = {m.lower(): m for m in data["mid"].keys()}

_SUB_LOOKUP: dict[str, dict[str, dict[str, str]]] = {}
for major, data in TAXONOMY.items():
    _SUB_LOOKUP[major.lower()] = {}
    for mid, subs in data["mid"].items():
        _SUB_LOOKUP[major.lower()][mid.lower()] = {s.lower(): s for s in subs}

# ── v1 → v2 마이그레이션 매핑 ──
_MAJOR_MIGRATION: dict[str, str] = {
    "hard_sfx": "SFX",
}

_MID_MIGRATION: dict[str, dict[str, str]] = {
    "sfx": {
        "impact_hit": "Impact",
        "crash_break": "Impact",
        "gunshot_weapon": "Weapon",
        "water_impact": "Water",
        "human_nonspeech": "Human",
        "construction": "Mechanical",
        "sports": "Sports",
        "general": "Impact",
    },
    "cinematic": {
        "riser_sweller": "Riser",
        "hit_impact": "Hit",
        "whoosh_transition": "Whoosh",
        "drone_texture": "Drone",
        "stab_sting": "Stinger",
        "ui_notification": "Transition",
        "dark": "Horror",
        "fantasy": "Fantasy",
        "impact": "Hit",
    },
    "foley": {
        "cloth_rustle": "Cloth",
        "body_movement": "Body",
        "hand_touch": "Body",
        "object_handling": "Object",
        "object_interaction": "Object",
        "eating_drinking": "Food_Drink",
        "movement": "Object",
        "misc_foley": "Object",
        "material": "Material_Texture",
    },
    "ambience": {
        "special": "Designed",
        "human": "Crowd",
        "mechanical": "Machine_Room",
    },
    "dialogue_vo": {
        "narration_vo": "Narration",
        "voiceover": "Narration",
        "human": "Dialogue",
    },
    "music": {
        "drone_pad": "Synth_Pad",
        "stinger": "Jingle",
    },
}

# ── 별칭 매핑 (Gemini 오분류 대응) ──
_MID_ALIASES: dict[str, dict[str, str]] = {
    "sfx": {
        "footstep": "Impact",
        "drone": "Electronic",
        "whoosh": "Impact",
    },
    "cinematic": {
        "drone": "Drone",
    },
    "foley": {
        "footstep": "Footsteps",
        "material": "Material_Texture",
    },
}


def validate_classification(major: str, mid: str, sub: str | None) -> tuple[str, str, str | None]:
    """
    분류 결과를 검증하고 정규화.
    대소문자 무시, v1→v2 마이그레이션, 별칭 매핑.
    """
    major_lower = major.lower()

    # major 마이그레이션 (Hard_SFX → SFX)
    norm_major = _MAJOR_MIGRATION.get(major_lower)
    if not norm_major:
        norm_major = _MAJOR_LOOKUP.get(major_lower)
    if not norm_major:
        return "SFX", "Impact", None

    # mid 정규화
    mid_lower = mid.lower()
    norm_major_lower = norm_major.lower()
    mid_lookup = _MID_LOOKUP.get(norm_major_lower, {})
    norm_mid = mid_lookup.get(mid_lower)

    # v1 → v2 마이그레이션
    if not norm_mid:
        migrations = _MID_MIGRATION.get(norm_major_lower, {})
        norm_mid = migrations.get(mid_lower)

    # 별칭 체크
    if not norm_mid:
        aliases = _MID_ALIASES.get(norm_major_lower, {})
        norm_mid = aliases.get(mid_lower)

    # 여전히 못 찾으면 첫 번째 mid로 폴백
    if not norm_mid:
        norm_mid = list(TAXONOMY[norm_major]["mid"].keys())[0]

    # sub 정규화
    if sub:
        sub_lower = sub.lower()
        sub_lookup = _SUB_LOOKUP.get(norm_major_lower, {}).get(norm_mid.lower(), {})
        norm_sub = sub_lookup.get(sub_lower)
        if not norm_sub:
            norm_sub = None
    else:
        norm_sub = None

    return norm_major, norm_mid, norm_sub
