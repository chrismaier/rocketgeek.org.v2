"""
motor_hardware_models_v1.py

Core data models for rocket motor hardware:
- Motor parts (cases, closures, nozzles, etc.)
- Motor assemblies (specific hardware stacks)
- Motor reloads (liner + grains + expendables, tied to an assembly)
- Casting supplies (stock liner and casting tube inventory)

This module is deliberately independent of any persistence mechanism.
Future modules (e.g., motor_data_store_v1.py) can provide S3, local FS, or
other backends without changing these models.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional, Literal

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Shared / common value objects
# ---------------------------------------------------------------------------


class Mass(BaseModel):
    """Represents mass in multiple units for convenience."""

    total_grams: float = Field(..., description="Total mass in grams.")
    total_ounces: Optional[float] = Field(
        None, description="Total mass in ounces (optional, can be derived)."
    )
    total_pounds: Optional[float] = Field(
        None, description="Total mass in pounds (optional, can be derived)."
    )


class LinearMass(BaseModel):
    """Represents linear mass (e.g., grams per inch for liner stock)."""

    grams_per_inch: float = Field(..., description="Mass per inch in grams.")
    ounces_per_inch: Optional[float] = Field(
        None, description="Mass per inch in ounces (optional)."
    )


class EcosystemEnum(str, Enum):
    AMW = "AMW"
    AT = "AT"
    CTI = "CTI"
    TRUECORE = "TrueCore"
    OTHER = "Other"


class RetentionEnum(str, Enum):
    SNAP_RING = "snap-ring"
    THREADED = "threaded"
    FRANKENSTEIN = "Frankenstein"


class ExpansionProfileEnum(str, Enum):
    NEUTRAL = "neutral"
    TAPERED = "tapered"


class PartTypeEnum(str, Enum):
    CASE = "case"
    CLOSURE = "closure"
    NOZZLE = "nozzle"
    OTHER = "other"


class PartRoleEnum(str, Enum):
    CASE = "case"
    FORWARD_CLOSURE = "forward_closure"
    AFT_CLOSURE = "aft_closure"
    AFT_CLOSURE_NOZZLE = "aft_closure_nozzle"
    NOZZLE = "nozzle"
    NOZZLE_RETAINER = "nozzle_retainer"
    OTHER = "other"


class CastingSupplyTypeEnum(str, Enum):
    LINER = "liner"
    CASTING_TUBE = "casting_tube"
    OTHER = "other"


class MotorStandardEnum(str, Enum):
    """Nominal motor standard labels (marketing / ecosystem labels)."""

    MM54 = "54mm"
    MM75 = "75mm"
    MM98 = "98mm"
    OTHER = "other"


class ORingSpec(BaseModel):
    """Describes an O-ring and its groove geometry on a part."""

    position: str = Field(
        ..., description="Logical position label, e.g. 'case_seal_inner'."
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
    """Describes a shoulder that intrudes into the case or liner."""

    shoulder_length_inch: float = Field(
        ..., description="Axial length of the shoulder in inches."
    )
    shoulder_length_mm: Optional[float] = Field(
        None, description="Axial length of the shoulder in millimeters."
    )
    shoulder_outer_diameter_inch: float = Field(
        ...,
        description=(
            "Largest outer diameter of the shoulder in inches; should be slightly "
            "less than the case inner diameter for clearance."
        ),
    )
    shoulder_outer_diameter_mm: Optional[float] = Field(
        None, description="Largest outer diameter of the shoulder in millimeters."
    )


class NozzleGeometry(BaseModel):
    """Core nozzle geometry parameters."""

    throat_diameter_inch: float = Field(
        ..., description="Nozzle throat diameter in inches."
    )
    throat_diameter_mm: Optional[float] = Field(
        None, description="Nozzle throat diameter in millimeters."
    )
    exit_diameter_inch: float = Field(
        ..., description="Nozzle exit diameter in inches."
    )
    exit_diameter_mm: Optional[float] = Field(
        None, description="Nozzle exit diameter in millimeters."
    )
    expansion_ratio: float = Field(..., description="Nozzle expansion ratio.")
    expansion_profile: ExpansionProfileEnum = Field(
        ExpansionProfileEnum.NEUTRAL,
        description="Expansion profile: neutral or tapered.",
    )


# ---------------------------------------------------------------------------
# Motor parts
# ---------------------------------------------------------------------------


class MotorPartBase(BaseModel):
    """Base model for any single motor hardware part."""

    part_id: str = Field(..., description="Unique ID for this part record.")
    part_type: PartTypeEnum = Field(
        PartTypeEnum.OTHER, description="High-level classification of the part."
    )
    role: PartRoleEnum = Field(
        PartRoleEnum.OTHER,
        description=(
            "Functional role in an assembly (case, forward_closure, "
            "aft_closure_nozzle, etc.)."
        ),
    )

    version: str = Field(..., description="Version tag, e.g. 'v1'.")
    display_name: str = Field(..., description="Human-readable name.")
    motor_standard: MotorStandardEnum = Field(
        MotorStandardEnum.OTHER,
        description="Nominal motor standard, e.g., '54mm'.",
    )
    ecosystem: List[EcosystemEnum] = Field(
        default_factory=list,
        description="Ecosystems this part is associated with, e.g. ['AMW', 'AT'].",
    )
    manufacturer_id: Optional[str] = Field(
        None, description="Short vendor ID, e.g. 'AMW', 'AT', 'TrueCore'."
    )
    manufacturer_name: Optional[str] = Field(
        None, description="Full manufacturer or brand name."
    )
    notes: Optional[str] = Field(None, description="Free-form notes.")


class CaseDimensions(BaseModel):
    """Dimensions specific to a case body."""

    inner_diameter_inch: float = Field(
        ..., description="Case inner diameter in inches."
    )
    inner_diameter_mm: Optional[float] = Field(
        None, description="Case inner diameter in millimeters."
    )
    outer_diameter_inch: float = Field(
        ..., description="Case outer diameter in inches."
    )
    outer_diameter_mm: Optional[float] = Field(
        None, description="Case outer diameter in millimeters."
    )
    overall_length_inch: float = Field(
        ..., description="Total case length in inches, including shoulders."
    )
    overall_length_mm: Optional[float] = Field(
        None, description="Total case length in millimeters."
    )
    usable_length_inch: float = Field(
        ..., description="Usable internal length for liner and propellant."
    )
    usable_length_mm: Optional[float] = Field(
        None, description="Usable internal length in millimeters."
    )


class CasePart(MotorPartBase):
    """A specific motor case (tube) part."""

    part_type: PartTypeEnum = Field(
        PartTypeEnum.CASE, description="Part type is 'case'."
    )
    role: PartRoleEnum = Field(
        PartRoleEnum.CASE, description="Functional role is 'case'."
    )

    dimensions: CaseDimensions
    retention: RetentionEnum = Field(
        RetentionEnum.SNAP_RING,
        description="Retention style: snap-ring, threaded, or Frankenstein.",
    )
    material: str = Field(..., description="Material, e.g. '6061-T6 Aluminum'.")
    max_operating_pressure_psi: Optional[float] = Field(
        None, description="Maximum recommended operating pressure in psi."
    )
    mass: Mass


class ClosureFeatures(BaseModel):
    """Flags describing functional features on a closure."""

    has_recovery_thread: bool = Field(
        False,
        description="True if closure has internal threading for a recovery harness.",
    )
    recovery_thread_size: Optional[str] = Field(
        None, description="Thread size for recovery attachment, e.g. '3/8-16'."
    )
    has_pressure_port: bool = Field(
        False,
        description="True if closure includes a port for pressure measurement.",
    )
    pressure_port_thread_size: Optional[str] = Field(
        None, description="Thread size for pressure port, e.g. '1/8 NPT'."
    )
    has_head_end_ignition: bool = Field(
        False,
        description="True if closure has a dedicated head-end ignition port.",
    )
    head_end_ignition_thread_size: Optional[str] = Field(
        None, description="Thread size for head-end ignition port, e.g. '8-32'."
    )


class ClosurePart(MotorPartBase):
    """
    A closure component (forward closure, aft closure, nozzle retainer, etc.).

    For snap-ring designs, the aft closure can be a pure closure, while the nozzle
    may be a separate 'aft_closure_nozzle' part (or integrated, depending on how
    you choose to represent it).
    """

    part_type: PartTypeEnum = Field(
        PartTypeEnum.CLOSURE, description="Part type is 'closure'."
    )

    shoulder: Optional[Shoulder] = None
    mass: Mass
    o_rings: List[ORingSpec] = Field(
        default_factory=list,
        description="O-rings associated with this closure.",
    )
    features: Optional[ClosureFeatures] = None


class NozzlePart(MotorPartBase):
    """
    A nozzle part. For snap-ring AMW-style hardware, this may also serve
    as the aft closure and use role=AFT_CLOSURE_NOZZLE.
    """

    part_type: PartTypeEnum = Field(
        PartTypeEnum.NOZZLE, description="Part type is 'nozzle'."
    )

    nozzle_geometry: NozzleGeometry
    shoulder: Optional[Shoulder] = None
    mass: Mass
    o_rings: List[ORingSpec] = Field(
        default_factory=list,
        description="O-rings associated with this nozzle or nozzle shoulder.",
    )


# ---------------------------------------------------------------------------
# Casting supplies (stock inventory for liners, casting tubes, etc.)
# ---------------------------------------------------------------------------


class LinerCastingSupplyDimensions(BaseModel):
    """Dimensions for liner or casting tube stock."""

    inner_diameter_inch: float = Field(
        ..., description="Inner diameter in inches."
    )
    inner_diameter_mm: Optional[float] = Field(
        None, description="Inner diameter in millimeters."
    )
    outer_diameter_inch: float = Field(
        ..., description="Outer diameter in inches."
    )
    outer_diameter_mm: Optional[float] = Field(
        None, description="Outer diameter in millimeters."
    )


class CastingSupply(BaseModel):
    """
    Represents stock casting supplies, such as uncropped liner or casting tube sticks.

    These are not tied to a specific reload geometry; they are inventory items that
    reload definitions reference via casting_supply_id.
    """

    casting_supply_id: str = Field(
        ..., description="Unique ID for this casting supply record."
    )
    supply_type: CastingSupplyTypeEnum = Field(
        ..., description="Type of supply, e.g. liner or casting_tube."
    )
    version: str = Field(..., description="Version tag, e.g. 'v1'.")
    display_name: str = Field(..., description="Human-readable supply name.")
    motor_standard: MotorStandardEnum = Field(
        MotorStandardEnum.OTHER,
        description="Nominal motor standard, e.g., '54mm'.",
    )
    ecosystem: List[EcosystemEnum] = Field(
        default_factory=list,
        description="Ecosystems that typically use this supply (AMW, AT, CTI, etc.).",
    )

    vendor_id: Optional[str] = Field(
        None, description="Vendor or brand ID, e.g. 'TrueCore'."
    )
    vendor_name: Optional[str] = Field(
        None, description="Full vendor or brand name."
    )

    notes: Optional[str] = Field(None, description="Free-form notes.")

    dimensions: LinerCastingSupplyDimensions
    stock_length_inch: float = Field(
        ..., description="Length of each stock piece in inches."
    )
    stock_length_mm: Optional[float] = Field(
        None, description="Length of each stock piece in millimeters."
    )

    mass: Optional[Mass] = None
    linear_mass: Optional[LinearMass] = None


# ---------------------------------------------------------------------------
# Motor assemblies
# ---------------------------------------------------------------------------


class AssemblyPartRef(BaseModel):
    """Reference to a part and its role in a specific motor assembly."""

    role: PartRoleEnum = Field(
        ..., description="Role of the part in the assembly (case, forward_closure, etc.)."
    )
    part_id: str = Field(..., description="ID of the motor part record.")


class StackGeometry(BaseModel):
    """
    Geometry derived for a particular hardware assembly:
    - usable length of the case
    - shoulder intrusions
    - recommended liner and grain stack lengths
    """

    case_usable_length_inch: float = Field(
        ..., description="Usable case length in inches."
    )
    forward_shoulder_length_inch: float = Field(
        ..., description="Forward shoulder intrusion in inches."
    )
    aft_shoulder_length_inch: float = Field(
        ..., description="Aft shoulder or nozzle shoulder intrusion in inches."
    )

    available_liner_length_inch: float = Field(
        ..., description="Length inside case available for liner."
    )
    recommended_liner_cut_length_inch: float = Field(
        ..., description="Recommended liner cut length for this assembly."
    )

    maximum_grain_stack_length_inch: float = Field(
        ..., description="Maximum allowed propellant grain stack length."
    )
    recommended_grain_stack_length_inch: float = Field(
        ..., description="Recommended total grain stack length."
    )

    liner_clearance_to_case_inch: Optional[float] = Field(
        None,
        description=(
            "Radial clearance between liner outer diameter and case inner diameter."
        ),
    )


class HardwareMassSummary(BaseModel):
    """Summarizes hardware mass for a given assembly."""

    total_hardware_mass_grams: float = Field(
        ..., description="Total mass of all hardware in grams."
    )
    total_hardware_mass_ounces: Optional[float] = Field(
        None, description="Total mass of all hardware in ounces."
    )
    total_hardware_mass_pounds: Optional[float] = Field(
        None, description="Total mass of all hardware in pounds."
    )


class MotorAssembly(BaseModel):
    """
    Represents a specific usable hardware stack (case + closures + nozzle, etc.).
    Reloads are built to fit a particular assembly_id.
    """

    assembly_id: str = Field(..., description="Unique ID for this assembly.")
    version: str = Field(..., description="Version tag, e.g. 'v1'.")
    display_name: str = Field(..., description="Human-readable name for this assembly.")
    motor_standard: MotorStandardEnum = Field(
        MotorStandardEnum.OTHER,
        description="Nominal motor standard, e.g. '54mm'.",
    )
    ecosystem: List[EcosystemEnum] = Field(
        default_factory=list,
        description="Ecosystem(s) this assembly belongs to, e.g. ['AMW'].",
    )
    notes: Optional[str] = Field(None, description="Free-form notes for this assembly.")

    parts: List[AssemblyPartRef] = Field(
        ..., description="List of part references used in this assembly."
    )

    stack_geometry: StackGeometry
    hardware_mass: HardwareMassSummary

    @field_validator("parts")
    @classmethod
    def validate_part_roles(cls, parts: List[AssemblyPartRef]) -> List[AssemblyPartRef]:
        """
        Simple sanity check to ensure that at least one case exists in the assembly.
        More constraints can be added later if needed.
        """
        has_case = any(
            part.role == PartRoleEnum.CASE
            for part in parts
        )
        if not has_case:
            raise ValueError("Assembly must include at least one part with role='case'.")
        return parts


# ---------------------------------------------------------------------------
# Motor reloads (liner, grains, expendables, performance) tied to an assembly
# ---------------------------------------------------------------------------


class LinerReloadInfo(BaseModel):
    """Liner cut information for a specific motor reload."""

    casting_supply_id: str = Field(
        ..., description="ID of the liner casting supply used."
    )
    cut_length_inch: float = Field(
        ..., description="Liner cut length in inches for this reload."
    )
    cut_length_mm: Optional[float] = Field(
        None, description="Liner cut length in millimeters."
    )
    pieces_per_motor: int = Field(
        1, description="Number of liner pieces used per motor reload."
    )


class CastingTubeReloadInfo(BaseModel):
    """Casting tube cut information for a specific motor reload."""

    casting_supply_id: str = Field(
        ..., description="ID of the casting tube casting supply used."
    )
    grain_count: int = Field(
        ..., description="Number of grains in the reload."
    )
    cut_length_per_grain_inch: float = Field(
        ..., description="Casting tube length per grain in inches."
    )
    cut_length_per_grain_mm: Optional[float] = Field(
        None, description="Casting tube length per grain in millimeters."
    )
    total_casting_tube_length_inch: float = Field(
        ..., description="Total casting tube length used, in inches."
    )
    total_casting_tube_length_mm: Optional[float] = Field(
        None, description="Total casting tube length used, in millimeters."
    )


class GrainGeometry(BaseModel):
    """Grain geometry parameters for a specific motor reload."""

    grain_outer_diameter_inch: float = Field(
        ..., description="Grain outer diameter in inches."
    )
    grain_outer_diameter_mm: Optional[float] = Field(
        None, description="Grain outer diameter in millimeters."
    )
    grain_core_diameter_inch: float = Field(
        ..., description="Grain core diameter in inches."
    )
    grain_core_diameter_mm: Optional[float] = Field(
        None, description="Grain core diameter in millimeters."
    )
    grain_length_inch: float = Field(
        ..., description="Individual grain length in inches."
    )
    grain_length_mm: Optional[float] = Field(
        None, description="Individual grain length in millimeters."
    )
    grain_count: int = Field(
        ..., description="Number of grains in the reload."
    )
    web_thickness_inch: Optional[float] = Field(
        None, description="Web thickness in inches (optional)."
    )
    web_thickness_mm: Optional[float] = Field(
        None, description="Web thickness in millimeters (optional)."
    )


class ORingConsumable(BaseModel):
    """Represents a single-use O-ring requirement for a motor reload."""

    part_number: str = Field(..., description="O-ring part number.")
    application: str = Field(
        ..., description="Usage context, e.g. 'forward_closure_case_seal'."
    )
    quantity_per_motor: int = Field(
        ..., description="Quantity consumed per motor reload."
    )
    material: Optional[str] = Field(
        None, description="Material, e.g. 'Viton'."
    )
    nominal_cross_section_inch: Optional[float] = Field(
        None, description="Nominal cross-section in inches."
    )
    nominal_inner_diameter_inch: Optional[float] = Field(
        None, description="Nominal inner diameter in inches."
    )


class InhibitorConsumable(BaseModel):
    """Represents an inhibitor used in a reload."""

    inhibitor_type: str = Field(
        ..., description="Type of inhibitor, e.g. 'end_grain_cardboard'."
    )
    thickness_inch: float = Field(
        ..., description="Thickness in inches."
    )
    thickness_mm: Optional[float] = Field(
        None, description="Thickness in millimeters."
    )
    quantity_per_motor: int = Field(
        ..., description="Quantity used per motor."
    )
    notes: Optional[str] = Field(
        None, description="Additional details or usage notes."
    )


class InsulationDiskConsumable(BaseModel):
    """Represents an insulation disk used in a reload."""

    disk_location: str = Field(
        ..., description="Location, e.g. 'forward_bulkhead'."
    )
    material: str = Field(
        ..., description="Material, e.g. 'Fiber'."
    )
    thickness_inch: float = Field(
        ..., description="Thickness in inches."
    )
    thickness_mm: Optional[float] = Field(
        None, description="Thickness in millimeters."
    )
    quantity_per_motor: int = Field(
        ..., description="Quantity used per motor."
    )


class IgniterConsumable(BaseModel):
    """Represents an igniter configuration for a reload."""

    igniter_type: str = Field(
        ..., description="Type, e.g. 'electric_match_with_booster'."
    )
    lead_length_inch: float = Field(
        ..., description="Lead length in inches."
    )
    lead_length_mm: Optional[float] = Field(
        None, description="Lead length in millimeters."
    )
    quantity_per_motor: int = Field(
        ..., description="Quantity used per motor."
    )


class ReloadConsumables(BaseModel):
    """All single-use components required to build one motor reload."""

    o_rings_single_use: List[ORingConsumable] = Field(
        default_factory=list,
        description="Single-use O-rings consumed by this reload.",
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


class PerformanceEstimates(BaseModel):
    """Performance estimates for a given reload configuration."""

    initial_kn: Optional[float] = Field(
        None, description="Estimated initial Kn."
    )
    maximum_kn: Optional[float] = Field(
        None, description="Estimated maximum Kn."
    )
    estimated_peak_pressure_psi: Optional[float] = Field(
        None, description="Estimated peak chamber pressure in psi."
    )
    estimated_average_pressure_psi: Optional[float] = Field(
        None, description="Estimated average chamber pressure in psi."
    )
    estimated_isp_seconds: Optional[float] = Field(
        None, description="Estimated specific impulse in seconds."
    )
    estimated_total_impulse_newton_second: Optional[float] = Field(
        None, description="Estimated total impulse in N·s."
    )
    chamber_residence_time_milliseconds: Optional[float] = Field(
        None, description="Estimated chamber residence time in milliseconds."
    )


class ReloadMassBreakdown(BaseModel):
    """Mass breakdown for a loaded motor."""

    hardware_mass_grams: float = Field(
        ..., description="Hardware mass in grams."
    )
    propellant_mass_grams: float = Field(
        ..., description="Propellant mass in grams."
    )
    liner_and_tube_mass_grams: Optional[float] = Field(
        None, description="Mass of liner and casting tube in grams."
    )
    total_loaded_mass_grams: float = Field(
        ..., description="Total loaded motor mass in grams."
    )
    total_loaded_mass_ounces: Optional[float] = Field(
        None, description="Total loaded motor mass in ounces."
    )
    total_loaded_mass_pounds: Optional[float] = Field(
        None, description="Total loaded motor mass in pounds."
    )


class MotorReload(BaseModel):
    """
    A motor reload (liner + grains + expendables) designed to fit
    a specific motor assembly.
    """

    motor_reload_id: str = Field(
        ..., description="Unique ID for this motor reload record."
    )
    version: str = Field(..., description="Version tag, e.g. 'v1'.")
    display_name: str = Field(
        ..., description="Human-readable name for this reload."
    )

    assembly_id: str = Field(
        ..., description="ID of the motor assembly this reload fits."
    )
    motor_standard: MotorStandardEnum = Field(
        MotorStandardEnum.OTHER,
        description="Nominal motor standard, e.g. '54mm'.",
    )
    ecosystem: List[EcosystemEnum] = Field(
        default_factory=list,
        description="Ecosystem(s) this reload belongs to, e.g. ['AMW'].",
    )
    propellant_id: Optional[str] = Field(
        None, description="ID of the propellant formulation used."
    )
    notes: Optional[str] = Field(
        None, description="Free-form notes for this reload."
    )

    liner: LinerReloadInfo
    casting_tubes: CastingTubeReloadInfo
    grain_geometry: GrainGeometry
    consumables: ReloadConsumables

    performance_estimates: Optional[PerformanceEstimates] = None
    mass_breakdown: Optional[ReloadMassBreakdown] = None

