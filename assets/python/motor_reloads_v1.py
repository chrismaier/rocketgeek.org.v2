"""
motor_reloads_v1.py

Models for motor reloads, which describe:
    - liner and casting tube cuts drawn from casting supplies
    - grain geometry
    - single-use consumables (O-rings, inhibitors, insulation, igniters)
    - optional performance estimates and mass breakdown

Each reload is designed to fit a specific motor hardware assembly via assembly_id.

Depends on:
    motor_common_v1.py
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from motor_common_v1 import (
    Ecosystem,
    MotorStandard,
)


# ---------------------------------------------------------------------------
# Liner and casting tube info for a reload
# ---------------------------------------------------------------------------


class LinerReloadInfo(BaseModel):
    """
    Liner cut information for a specific motor reload.

    The liner itself comes from a casting supply record (e.g. TrueCore 54 mm),
    but here we only store which supply and how it is cut for this reload.
    """

    casting_supply_id: str = Field(
        ...,
        description="ID of the liner casting supply used (from casting-supplies).",
    )
    cut_length_inch: float = Field(
        ...,
        description="Liner cut length in inches for this reload.",
    )
    cut_length_mm: Optional[float] = Field(
        None,
        description="Liner cut length in millimeters (optional).",
    )
    pieces_per_motor: int = Field(
        1,
        description="Number of liner pieces used per motor reload.",
    )


class CastingTubeReloadInfo(BaseModel):
    """
    Casting tube cut information for a specific motor reload.

    The raw casting tube spec comes from a casting supply record, but
    this model only describes how that tube is cut and used for grains.
    """

    casting_supply_id: str = Field(
        ...,
        description="ID of the casting tube casting supply used.",
    )
    grain_count: int = Field(
        ...,
        description="Number of grains in the reload.",
    )
    cut_length_per_grain_inch: float = Field(
        ...,
        description="Casting tube length per grain in inches.",
    )
    cut_length_per_grain_mm: Optional[float] = Field(
        None,
        description="Casting tube length per grain in millimeters (optional).",
    )
    total_casting_tube_length_inch: float = Field(
        ...,
        description="Total casting tube length used for this reload, in inches.",
    )
    total_casting_tube_length_mm: Optional[float] = Field(
        None,
        description="Total casting tube length used, in millimeters (optional).",
    )


# ---------------------------------------------------------------------------
# Grain geometry for a reload
# ---------------------------------------------------------------------------


class GrainGeometry(BaseModel):
    """
    Grain geometry for a specific motor reload.

    This is tightly coupled to the propellant and the assembly envelope,
    and is where we will later plug in BATES and other grain shapes.
    """

    grain_outer_diameter_inch: float = Field(
        ...,
        description="Grain outer diameter in inches.",
    )
    grain_core_diameter_inch: float = Field(
        ...,
        description="Grain core diameter in inches.",
    )
    grain_length_inch: float = Field(
        ...,
        description="Individual grain length in inches.",
    )
    grain_count: int = Field(
        ...,
        description="Number of grains used in the reload.",
    )

    grain_outer_diameter_mm: Optional[float] = Field(
        None,
        description="Grain outer diameter in millimeters (optional).",
    )
    grain_core_diameter_mm: Optional[float] = Field(
        None,
        description="Grain core diameter in millimeters (optional).",
    )
    grain_length_mm: Optional[float] = Field(
        None,
        description="Individual grain length in millimeters (optional).",
    )

    web_thickness_inch: Optional[float] = Field(
        None,
        description="Web thickness in inches (optional).",
    )
    web_thickness_mm: Optional[float] = Field(
        None,
        description="Web thickness in millimeters (optional).",
    )


# ---------------------------------------------------------------------------
# Consumables used per reload
# ---------------------------------------------------------------------------


class ORingConsumable(BaseModel):
    """
    Single-use O-ring requirement for a motor reload.

    This does not need groove geometry; it is focused on consumption
    of specific part numbers per reload.
    """

    part_number: str = Field(
        ...,
        description="O-ring part number, for example AS568 designation.",
    )
    application: str = Field(
        ...,
        description="Usage context, such as 'forward_closure_case_seal'.",
    )
    quantity_per_motor: int = Field(
        ...,
        description="Quantity of this O-ring consumed per motor reload.",
    )
    material: Optional[str] = Field(
        None,
        description="Material, such as 'Viton'.",
    )
    nominal_cross_section_inch: Optional[float] = Field(
        None,
        description="Nominal cross-section in inches (optional).",
    )
    nominal_inner_diameter_inch: Optional[float] = Field(
        None,
        description="Nominal inner diameter in inches (optional).",
    )


class InhibitorConsumable(BaseModel):
    """Represents an inhibitor used in a reload."""

    inhibitor_type: str = Field(
        ...,
        description="Type of inhibitor, for example 'end_grain_cardboard'.",
    )
    thickness_inch: float = Field(
        ...,
        description="Inhibitor thickness in inches.",
    )
    quantity_per_motor: int = Field(
        ...,
        description="Number of inhibitor pieces used per motor.",
    )

    thickness_mm: Optional[float] = Field(
        None,
        description="Inhibitor thickness in millimeters (optional).",
    )
    notes: Optional[str] = Field(
        None,
        description="Usage notes or additional details.",
    )


class InsulationDiskConsumable(BaseModel):
    """Represents an insulation disk used in a reload."""

    disk_location: str = Field(
        ...,
        description="Location, for example 'forward_bulkhead'.",
    )
    material: str = Field(
        ...,
        description="Material, such as 'Fiber'.",
    )
    thickness_inch: float = Field(
        ...,
        description="Disk thickness in inches.",
    )
    quantity_per_motor: int = Field(
        ...,
        description="Number of disks used per motor.",
    )

    thickness_mm: Optional[float] = Field(
        None,
        description="Disk thickness in millimeters (optional).",
    )


class IgniterConsumable(BaseModel):
    """Represents an igniter configuration for a reload."""

    igniter_type: str = Field(
        ...,
        description="Type, for example 'electric_match_with_booster'.",
    )
    lead_length_inch: float = Field(
        ...,
        description="Lead length in inches.",
    )
    quantity_per_motor: int = Field(
        ...,
        description="Number of igniters used per motor.",
    )

    lead_length_mm: Optional[float] = Field(
        None,
        description="Lead length in millimeters (optional).",
    )


class ReloadConsumables(BaseModel):
    """
    All single-use components required to build one motor reload.

    This is the shopping/build list for one load, separated from the
    persistent hardware and casting supplies definitions.
    """

    o_rings_single_use: List[ORingConsumable] = Field(
        default_factory=list,
        description="O-rings consumed by this reload.",
    )
    inhibitors: List[InhibitorConsumable] = Field(
        default_factory=list,
        description="Inhibitors used in this reload.",
    )
    insulation_disks: List[InsulationDiskConsumable] = Field(
        default_factory=list,
        description="Insulation disks used in this reload.",
    )
    igniters: List[IgniterConsumable] = Field(
        default_factory=list,
        description="Igniters used in this reload.",
    )


# ---------------------------------------------------------------------------
# Performance and mass estimates
# ---------------------------------------------------------------------------


class PerformanceEstimates(BaseModel):
    """
    Performance estimates for a given reload configuration.

    These are approximate values that can be refined later with
    more sophisticated simulation.
    """

    initial_kn: Optional[float] = Field(
        None,
        description="Estimated initial Kn (dimensionless).",
    )
    maximum_kn: Optional[float] = Field(
        None,
        description="Estimated maximum Kn (dimensionless).",
    )
    estimated_peak_pressure_psi: Optional[float] = Field(
        None,
        description="Estimated peak chamber pressure in psi.",
    )
    estimated_average_pressure_psi: Optional[float] = Field(
        None,
        description="Estimated average chamber pressure in psi.",
    )
    estimated_isp_seconds: Optional[float] = Field(
        None,
        description="Estimated specific impulse in seconds.",
    )
    estimated_total_impulse_newton_second: Optional[float] = Field(
        None,
        description="Estimated total impulse in N·s.",
    )
    chamber_residence_time_milliseconds: Optional[float] = Field(
        None,
        description="Estimated chamber residence time in milliseconds.",
    )


class ReloadMassBreakdown(BaseModel):
    """Mass breakdown for a loaded motor using this reload."""

    hardware_mass_grams: float = Field(
        ...,
        description="Hardware mass in grams (from the assembly).",
    )
    propellant_mass_grams: float = Field(
        ...,
        description="Propellant mass in grams.",
    )
    total_loaded_mass_grams: float = Field(
        ...,
        description="Total loaded motor mass in grams.",
    )

    liner_and_tube_mass_grams: Optional[float] = Field(
        None,
        description="Mass of liner and casting tube in grams (optional).",
    )
    total_loaded_mass_ounces: Optional[float] = Field(
        None,
        description="Total loaded motor mass in ounces (optional).",
    )
    total_loaded_mass_pounds: Optional[float] = Field(
        None,
        description="Total loaded motor mass in pounds (optional).",
    )


# ---------------------------------------------------------------------------
# Motor reload record
# ---------------------------------------------------------------------------


class MotorReload(BaseModel):
    """
    A motor reload (liner + grains + expendables) designed to fit
    a specific motor hardware assembly.

    It is linked to:
        - assembly_id (from motor_assemblies_v1)
        - casting_supply_id(s) (from casting-supplies)
    """

    motor_reload_id: str = Field(
        ...,
        description="Unique ID for this motor reload record.",
    )
    version: str = Field(
        ...,
        description="Version tag, such as 'v1'.",
    )
    display_name: str = Field(
        ...,
        description="Human-readable name for this reload.",
    )

    assembly_id: str = Field(
        ...,
        description="ID of the motor assembly this reload is designed to fit.",
    )
    motor_standard: MotorStandard = Field(
        MotorStandard.OTHER,
        description="Nominal motor standard label, such as '54mm'.",
    )
    ecosystem: List[Ecosystem] = Field(
        default_factory=list,
        description="Ecosystem(s) this reload belongs to, such as ['AMW'].",
    )

    propellant_id: Optional[str] = Field(
        None,
        description="ID of the propellant formulation used (if tracked).",
    )
    notes: Optional[str] = Field(
        None,
        description="Optional free-form notes for this reload.",
    )

    liner: LinerReloadInfo = Field(
        ...,
        description="Liner cut information for this reload.",
    )
    casting_tubes: CastingTubeReloadInfo = Field(
        ...,
        description="Casting tube cut information for this reload.",
    )
    grain_geometry: GrainGeometry = Field(
        ...,
        description="Grain geometry for this reload.",
    )
    consumables: ReloadConsumables = Field(
        default_factory=ReloadConsumables,
        description="Single-use components required for one reload.",
    )

    performance_estimates: Optional[PerformanceEstimates] = Field(
        None,
        description="Optional performance estimates for this reload.",
    )
    mass_breakdown: Optional[ReloadMassBreakdown] = Field(
        None,
        description="Optional mass breakdown for this reload.",
    )

