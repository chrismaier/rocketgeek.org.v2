"""
motor_casting_supplies_v1.py

Models for casting supplies (stock inventory), such as:
    - liner sticks
    - casting tube sticks

These represent generic, uncut inventory that multiple reloads can draw from.
A motor reload will reference these records via casting_supply_id.

Depends on:
    motor_common_v1.py
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from motor_common_v1 import (
    Ecosystem,
    MotorStandard,
    CastingSupplyType,
    Mass,
    LinearMass,
)


class CastingSupplyDimensions(BaseModel):
    """
    Dimensions for liner or casting tube stock.

    All values are inch-first, with optional millimeter fields.
    """

    inner_diameter_inch: float = Field(
        ...,
        description="Inner diameter in inches.",
    )
    outer_diameter_inch: float = Field(
        ...,
        description="Outer diameter in inches.",
    )

    inner_diameter_mm: Optional[float] = Field(
        None,
        description="Inner diameter in millimeters (optional).",
    )
    outer_diameter_mm: Optional[float] = Field(
        None,
        description="Outer diameter in millimeters (optional).",
    )


class CastingSupply(BaseModel):
    """
    Stock casting supply item, such as TrueCore 54 mm liner or paper casting tube.

    This is NOT tied to a specific reload geometry. It is an inventory definition
    that motor reload records reference through casting_supply_id.
    """

    casting_supply_id: str = Field(
        ...,
        description="Unique ID for this casting supply record.",
    )
    supply_type: CastingSupplyType = Field(
        ...,
        description="Type of supply, such as 'liner' or 'casting_tube'.",
    )

    version: str = Field(
        ...,
        description="Version tag, for example 'v1'.",
    )
    display_name: str = Field(
        ...,
        description="Human-readable name for this supply item.",
    )

    motor_standard: MotorStandard = Field(
        MotorStandard.OTHER,
        description="Nominal motor standard label, such as '54mm'.",
    )
    ecosystem: List[Ecosystem] = Field(
        default_factory=list,
        description="Ecosystem(s) that typically use this supply (AMW, AT, CTI, etc.).",
    )

    vendor_id: Optional[str] = Field(
        None,
        description="Vendor or brand ID, such as 'TrueCore' or 'AMW'.",
    )
    vendor_name: Optional[str] = Field(
        None,
        description="Full vendor or brand name.",
    )

    notes: Optional[str] = Field(
        None,
        description="Optional notes about this supply.",
    )

    dimensions: CastingSupplyDimensions = Field(
        ...,
        description="Dimensional specification for this supply item.",
    )

    stock_length_inch: float = Field(
        ...,
        description="Length of each stock piece in inches.",
    )
    stock_length_mm: Optional[float] = Field(
        None,
        description="Length of each stock piece in millimeters (optional).",
    )

    mass: Optional[Mass] = Field(
        None,
        description="Mass of one full stock piece (optional but useful).",
    )
    linear_mass: Optional[LinearMass] = Field(
        None,
        description="Mass per inch of this supply (optional, but very useful).",
    )

    # Optional basic inventory tracking (can be ignored if not needed).
    pieces_in_inventory: Optional[int] = Field(
        None,
        description=(
            "Optional count of stock pieces currently on hand for this supply. "
            "More detailed inventory tracking can be handled elsewhere if needed."
        ),
    )

