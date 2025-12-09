"""
motor_parts_v1.py

Models for individual rocket motor hardware parts:
- CasePart
- ClosurePart
- NozzlePart

These classes describe single physical items and do NOT know where data lives
(S3, disk, etc.). Persistence and loading logic should go into a separate
module (for example, motor_data_store_v1.py).

Depends on:
    motor_common_v1.py
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from motor_common_v1 import (
    Ecosystem,
    MotorStandard,
    RetentionStyle,
    PartType,
    PartRole,
    Mass,
    ORingSpec,
    Shoulder,
    NozzleGeometry,
)


# ---------------------------------------------------------------------------
# Base class for all motor parts
# ---------------------------------------------------------------------------


class MotorPartBase(BaseModel):
    """
    Base class for any single motor hardware part.

    Examples:
        - CasePart
        - ClosurePart
        - NozzlePart
    """

    part_id: str = Field(..., description="Unique ID for this part record.")
    part_type: PartType = Field(
        PartType.OTHER, description="High-level classification of the part."
    )
    role: PartRole = Field(
        PartRole.OTHER,
        description=(
            "Functional role inside an assembly, such as 'case', "
            "'forward_closure', 'aft_closure_nozzle', etc."
        ),
    )

    version: str = Field(..., description="Version tag, e.g. 'v1'.")
    display_name: str = Field(..., description="Human-readable name for this part.")
    motor_standard: MotorStandard = Field(
        MotorStandard.OTHER,
        description="Nominal motor standard label, such as '54mm'.",
    )
    ecosystem: List[Ecosystem] = Field(
        default_factory=list,
        description="Ecosystem(s) or brand families this part belongs to.",
    )

    manufacturer_id: Optional[str] = Field(
        None,
        description="Short manufacturer or vendor ID, such as 'AMW', 'AT', 'CTI'.",
    )
    manufacturer_name: Optional[str] = Field(
        None,
        description="Full manufacturer or brand name.",
    )

    notes: Optional[str] = Field(
        None,
        description="Optional notes about this part.",
    )


# ---------------------------------------------------------------------------
# Case
# ---------------------------------------------------------------------------


class CaseDimensions(BaseModel):
    """Dimensions specific to a case body."""

    inner_diameter_inch: float = Field(
        ...,
        description="Case inner diameter in inches.",
    )
    outer_diameter_inch: float = Field(
        ...,
        description="Case outer diameter in inches.",
    )
    overall_length_inch: float = Field(
        ...,
        description="Total case length in inches, including any end features.",
    )
    usable_length_inch: float = Field(
        ...,
        description="Usable internal length for liner and propellant, in inches.",
    )

    inner_diameter_mm: Optional[float] = Field(
        None,
        description="Case inner diameter in millimeters (optional).",
    )
    outer_diameter_mm: Optional[float] = Field(
        None,
        description="Case outer diameter in millimeters (optional).",
    )
    overall_length_mm: Optional[float] = Field(
        None,
        description="Total case length in millimeters (optional).",
    )
    usable_length_mm: Optional[float] = Field(
        None,
        description="Usable internal length in millimeters (optional).",
    )


class CasePart(MotorPartBase):
    """
    A specific motor case (tube) part.

    Example:
        A 54 mm AMW long snap-ring case.
    """

    part_type: PartType = Field(
        PartType.CASE,
        description="Part type is always 'case' for CasePart.",
    )
    role: PartRole = Field(
        PartRole.CASE,
        description="Functional role is 'case' inside an assembly.",
    )

    dimensions: CaseDimensions
    retention: RetentionStyle = Field(
        RetentionStyle.SNAP_RING,
        description="Retention style, such as snap-ring or threaded.",
    )
    material: str = Field(
        ...,
        description="Material description, such as '6061-T6 Aluminum'.",
    )
    max_operating_pressure_psi: Optional[float] = Field(
        None,
        description="Maximum recommended operating pressure in psi (optional).",
    )
    mass: Mass


# ---------------------------------------------------------------------------
# Closures
# ---------------------------------------------------------------------------


class ClosureFeatures(BaseModel):
    """Flags describing functional features on a closure."""

    has_recovery_thread: bool = Field(
        False,
        description="True if the closure has threading for a recovery harness.",
    )
    recovery_thread_size: Optional[str] = Field(
        None,
        description="Thread size for the recovery attachment, such as '3/8-16'.",
    )

    has_pressure_port: bool = Field(
        False,
        description="True if the closure includes a pressure gauge port.",
    )
    pressure_port_thread_size: Optional[str] = Field(
        None,
        description="Thread size for the pressure port, such as '1/8 NPT'.",
    )

    has_head_end_ignition: bool = Field(
        False,
        description="True if the closure includes a head-end ignition port.",
    )
    head_end_ignition_thread_size: Optional[str] = Field(
        None,
        description="Thread size for the head-end ignition port, such as '8-32'.",
    )


class ClosurePart(MotorPartBase):
    """
    A closure component.

    This can represent:
        - Forward closure
        - Aft closure for threaded systems
        - Nozzle retainer on commercial hardware
    """

    part_type: PartType = Field(
        PartType.CLOSURE,
        description="Part type is always 'closure' for ClosurePart.",
    )

    shoulder: Optional[Shoulder] = Field(
        None,
        description="Shoulder geometry if this closure intrudes into the case or liner.",
    )
    mass: Mass = Field(
        ...,
        description="Mass of the closure.",
    )
    o_rings: List[ORingSpec] = Field(
        default_factory=list,
        description="Any O-rings used on this closure.",
    )
    features: Optional[ClosureFeatures] = Field(
        None,
        description="Optional feature flags for this closure.",
    )


# ---------------------------------------------------------------------------
# Nozzles
# ---------------------------------------------------------------------------


class NozzlePart(MotorPartBase):
    """
    A nozzle part.

    For snap-ring AMW-style motors, this may also serve as the aft closure by
    setting role=PartRole.AFT_CLOSURE_NOZZLE.
    """

    part_type: PartType = Field(
        PartType.NOZZLE,
        description="Part type is always 'nozzle' for NozzlePart.",
    )

    nozzle_geometry: NozzleGeometry = Field(
        ...,
        description="Core nozzle geometry (throat, exit, expansion).",
    )
    shoulder: Optional[Shoulder] = Field(
        None,
        description="Shoulder geometry if the nozzle intrudes into the case or liner.",
    )
    mass: Mass = Field(
        ...,
        description="Mass of the nozzle.",
    )
    o_rings: List[ORingSpec] = Field(
        default_factory=list,
        description="Any O-rings associated with this nozzle or its shoulder.",
    )

