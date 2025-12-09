"""
motor_common_v1.py

Small, shared building blocks for rocket motor models:
- Enums for ecosystems, standards, roles, etc.
- Simple value objects (Mass, LinearMass, ORingSpec, Shoulder, NozzleGeometry).

Other modules (motor_parts_v1.py, motor_assemblies_v1.py, motor_reloads_v1.py)
should import these types instead of redefining them.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class Ecosystem(str, Enum):
    """Ecosystem or brand family a part or reload belongs to."""

    AMW = "AMW"
    AT = "AT"
    CTI = "CTI"
    TRUECORE = "TrueCore"
    OTHER = "Other"


class MotorStandard(str, Enum):
    """Nominal motor standard label (mostly marketing / ecosystem)."""

    MM54 = "54mm"
    MM75 = "75mm"
    MM98 = "98mm"
    OTHER = "other"


class RetentionStyle(str, Enum):
    """How the hardware is retained together."""

    SNAP_RING = "snap-ring"
    THREADED = "threaded"
    FRANKENSTEIN = "Frankenstein"


class ExpansionProfile(str, Enum):
    """Nozzle expansion behavior."""

    NEUTRAL = "neutral"
    TAPERED = "tapered"


class PartType(str, Enum):
    """High-level classification of a motor part."""

    CASE = "case"
    CLOSURE = "closure"
    NOZZLE = "nozzle"
    OTHER = "other"


class PartRole(str, Enum):
    """Functional role of a part inside an assembly."""

    CASE = "case"
    FORWARD_CLOSURE = "forward_closure"
    AFT_CLOSURE = "aft_closure"
    AFT_CLOSURE_NOZZLE = "aft_closure_nozzle"
    NOZZLE = "nozzle"
    NOZZLE_RETAINER = "nozzle_retainer"
    OTHER = "other"


class CastingSupplyType(str, Enum):
    """Type of casting supply in inventory."""

    LINER = "liner"
    CASTING_TUBE = "casting_tube"
    OTHER = "other"


# ---------------------------------------------------------------------------
# Small value objects
# ---------------------------------------------------------------------------


class Mass(BaseModel):
    """Represents mass in multiple units."""

    total_grams: float = Field(..., description="Total mass in grams.")
    total_ounces: Optional[float] = Field(
        None, description="Total mass in ounces (optional)."
    )
    total_pounds: Optional[float] = Field(
        None, description="Total mass in pounds (optional)."
    )


class LinearMass(BaseModel):
    """Mass per unit length, useful for liners and casting tubes."""

    grams_per_inch: float = Field(..., description="Mass per inch in grams.")
    ounces_per_inch: Optional[float] = Field(
        None, description="Mass per inch in ounces (optional)."
    )


class ORingSpec(BaseModel):
    """
    Describes an O-ring and, optionally, its groove geometry on a part.
    Groove offsets allow us to compute spacing when there are two seals.
    """

    position: str = Field(
        ...,
        description="Logical position label, e.g. 'case_seal_inner' or 'nozzle_seal'.",
    )
    part_number: str = Field(..., description="Vendor or AS568 O-ring part number.")
    cross_section_inch: float = Field(
        ..., description="Nominal O-ring cross-section in inches."
    )
    inner_diameter_inch: float = Field(
        ..., description="Nominal inner diameter in inches."
    )
    quantity: int = Field(
        1, description="Number of O-rings of this spec used on the part."
    )
    material: str = Field(..., description="Material, e.g. 'Viton', 'Nitrile'.")

    groove_depth_inch: Optional[float] = Field(
        None, description="Groove depth in inches (optional)."
    )
    groove_width_inch: Optional[float] = Field(
        None, description="Groove width in inches (optional)."
    )
    groove_center_offset_inch: Optional[float] = Field(
        None,
        description=(
            "Distance from a defined reference face to the groove center, "
            "in inches (optional, allows spacing calculations)."
        ),
    )


class Shoulder(BaseModel):
    """
    Describes a shoulder that intrudes into the case or liner.

    shoulder_outer_diameter_inch should normally be slightly less than the
    case inner diameter (for clearance) by roughly 0.020 inch.
    """

    shoulder_length_inch: float = Field(
        ..., description="Axial length of the shoulder in inches."
    )
    shoulder_outer_diameter_inch: float = Field(
        ...,
        description=(
            "Largest outer diameter of the shoulder in inches; should be "
            "slightly less than the case inner diameter."
        ),
    )
    shoulder_length_mm: Optional[float] = Field(
        None, description="Axial length of the shoulder in millimeters."
    )
    shoulder_outer_diameter_mm: Optional[float] = Field(
        None, description="Largest shoulder outer diameter in millimeters."
    )


class NozzleGeometry(BaseModel):
    """Core nozzle geometry parameters."""

    throat_diameter_inch: float = Field(
        ..., description="Nozzle throat diameter in inches."
    )
    exit_diameter_inch: float = Field(
        ..., description="Nozzle exit diameter in inches."
    )
    expansion_ratio: float = Field(..., description="Nozzle expansion ratio.")
    expansion_profile: ExpansionProfile = Field(
        ExpansionProfile.NEUTRAL,
        description="Expansion profile: neutral or tapered.",
    )

    throat_diameter_mm: Optional[float] = Field(
        None, description="Throat diameter in millimeters (optional)."
    )
    exit_diameter_mm: Optional[float] = Field(
        None, description="Exit diameter in millimeters (optional)."
    )

