"""
motor_assemblies_v1.py

Models for rocket motor hardware assemblies.

An assembly describes a specific stack of motor parts:
    - one case
    - one or more closures
    - optionally a separate nozzle / nozzle retainer

Motor reloads are built to fit a particular assembly_id.

Depends on:
    motor_common_v1.py
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from motor_common_v1 import (
    Ecosystem,
    MotorStandard,
    PartRole,
)


class AssemblyPartRef(BaseModel):
    """
    Reference to a motor part in an assembly.

    This does not embed the full part details; those are loaded separately
    from motor-parts JSON using part_id.
    """

    role: PartRole = Field(
        ...,
        description=(
            "Functional role of this part inside the assembly, such as "
            "'case', 'forward_closure', 'aft_closure_nozzle', etc."
        ),
    )
    part_id: str = Field(
        ...,
        description="ID of the motor part record (matches part_id in motor-parts).",
    )


class StackGeometry(BaseModel):
    """
    Simplified geometry for a given hardware assembly.

    These values describe the usable space between shoulders and give
    recommended liner and grain stack lengths. Detailed grain geometry
    lives with the motor reload, not the assembly.
    """

    case_usable_length_inch: float = Field(
        ...,
        description="Usable internal length of the case in inches.",
    )
    forward_shoulder_length_inch: float = Field(
        ...,
        description="Forward shoulder intrusion into the case in inches.",
    )
    aft_shoulder_length_inch: float = Field(
        ...,
        description="Aft shoulder or nozzle shoulder intrusion in inches.",
    )

    available_liner_length_inch: float = Field(
        ...,
        description="Length available for the liner between shoulders in inches.",
    )
    recommended_liner_cut_length_inch: float = Field(
        ...,
        description="Recommended liner cut length for this assembly in inches.",
    )

    maximum_grain_stack_length_inch: float = Field(
        ...,
        description="Maximum total length available for the propellant grain stack.",
    )
    recommended_grain_stack_length_inch: float = Field(
        ...,
        description="Recommended total length of the grain stack.",
    )

    liner_clearance_to_case_inch: Optional[float] = Field(
        None,
        description=(
            "Radial clearance between liner outer diameter and case inner "
            "diameter, in inches (optional)."
        ),
    )


class HardwareMassSummary(BaseModel):
    """
    Summarizes hardware mass for a given assembly.

    Detailed per-part masses live in the part records. This is a convenient
    roll-up for quick performance and handling estimates.
    """

    total_hardware_mass_grams: float = Field(
        ...,
        description="Total mass of all hardware in grams for this assembly.",
    )
    total_hardware_mass_ounces: Optional[float] = Field(
        None,
        description="Total mass of all hardware in ounces (optional).",
    )
    total_hardware_mass_pounds: Optional[float] = Field(
        None,
        description="Total mass of all hardware in pounds (optional).",
    )


class MotorAssembly(BaseModel):
    """
    Represents a specific usable hardware stack.

    Examples:
        - 54 mm AMW long snap-ring assembly:
            - case
            - forward closure (bulkhead)
            - aft closure nozzle (integrated nozzle)
        - 54 mm AT threaded assembly:
            - case
            - forward closure
            - nozzle
            - nozzle retainer

    Motor reloads are designed to fit a particular assembly_id.
    """

    assembly_id: str = Field(
        ...,
        description="Unique ID for this assembly record.",
    )
    version: str = Field(
        ...,
        description="Version tag, such as 'v1'.",
    )
    display_name: str = Field(
        ...,
        description="Human-readable name for this assembly.",
    )

    motor_standard: MotorStandard = Field(
        MotorStandard.OTHER,
        description="Nominal motor standard label, such as '54mm'.",
    )
    ecosystem: List[Ecosystem] = Field(
        default_factory=list,
        description="Ecosystem(s) this assembly belongs to, such as ['AMW'].",
    )

    notes: Optional[str] = Field(
        None,
        description="Optional free-form notes about this assembly.",
    )

    parts: List[AssemblyPartRef] = Field(
        ...,
        description="List of part references used in this assembly.",
    )

    stack_geometry: StackGeometry = Field(
        ...,
        description="Geometry for the usable space inside this assembly.",
    )
    hardware_mass: HardwareMassSummary = Field(
        ...,
        description="Total hardware mass summary for this assembly.",
    )

    @field_validator("parts")
    @classmethod
    def validate_part_roles(
        cls,
        parts: List[AssemblyPartRef],
    ) -> List[AssemblyPartRef]:
        """
        Basic sanity check: every assembly must include at least one case.

        Additional rules (such as 'only one case' or 'at most one nozzle')
        can be added later without changing the external JSON shape.
        """
        has_case = any(
            part_ref.role == PartRole.CASE
            for part_ref in parts
        )
        if not has_case:
            raise ValueError(
                "MotorAssembly must include at least one part with role='case'."
            )
        return parts

