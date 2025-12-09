"""
motor_store_v1.py

Small, pluggable persistence layer for motor models.

This module defines:
    - ModelStore: a simple interface for loading and saving Pydantic models
    - LocalJsonFileStore: a local JSON file implementation
    - Convenience helper functions that understand the standard directory
      layout:
        motor-data/
          motor-parts/
          motor-assemblies/
          casting-supplies/
          motor-reloads/

Later, you can add an S3-backed implementation that also satisfies ModelStore
without changing the rest of your code.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Protocol, Type, TypeVar

from pydantic import BaseModel

from motor_parts_v1 import CasePart, ClosurePart, NozzlePart, MotorPartBase
from motor_assemblies_v1 import MotorAssembly
from motor_casting_supplies_v1 import CastingSupply
from motor_reloads_v1 import MotorReload


ModelType = TypeVar("ModelType", bound=BaseModel)


# ---------------------------------------------------------------------------
# Store interface
# ---------------------------------------------------------------------------


class ModelStore(Protocol):
    """
    Minimal interface for loading and saving Pydantic models.

    Implementations can be:
        - LocalJsonFileStore (filesystem)
        - S3JsonStore (directory bucket)
        - Anything else that can load/save JSON strings.
    """

    def load_model(self, model_class: Type[ModelType], key: str) -> ModelType:
        """
        Load a model of type model_class identified by key.

        The interpretation of 'key' depends on the implementation:
            - LocalJsonFileStore treats it as a relative file path under base_directory.
            - S3 implementations could treat it as 'prefix/object_name.json'.
        """
        ...

    def save_model(self, model_instance: ModelType, key: str) -> None:
        """
        Save a model instance identified by key.

        The implementation decides how 'key' is mapped to an underlying object
        name, file path, or S3 key.
        """
        ...


# ---------------------------------------------------------------------------
# Local filesystem implementation
# ---------------------------------------------------------------------------


class LocalJsonFileStore:
    """
    Simple implementation of ModelStore that uses the local filesystem
    under a given base directory.

    Example:
        base_directory = Path("motor-data")
        store = LocalJsonFileStore(base_directory)

        case = store.load_model(CasePart, "motor-parts/case_54mm_amw_long_v1.json")
    """

    def __init__(self, base_directory: Path) -> None:
        self.base_directory = base_directory

    def _resolve_path(self, key: str) -> Path:
        """
        Turn a relative key into a filesystem path under base_directory.

        If the key does not end with '.json', it will be added automatically.
        """
        normalized_key = key if key.endswith(".json") else f"{key}.json"
        return self.base_directory / normalized_key

    def load_model(self, model_class: Type[ModelType], key: str) -> ModelType:
        target_path = self._resolve_path(key)
        with target_path.open("r", encoding="utf-8") as input_file:
            raw_text = input_file.read()
        # Use Pydantic's JSON parsing for robustness.
        return model_class.model_validate_json(raw_text)

    def save_model(self, model_instance: ModelType, key: str) -> None:
        target_path = self._resolve_path(key)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        json_text = model_instance.model_dump_json(indent=2)
        with target_path.open("w", encoding="utf-8") as output_file:
            output_file.write(json_text)


# ---------------------------------------------------------------------------
# Convenience helpers that know the standard directory layout
# ---------------------------------------------------------------------------

# These helpers assume the directory layout:
#   motor-data/
#     motor-parts/
#     motor-assemblies/
#     casting-supplies/
#     motor-reloads/


def _parts_key(part_id: str) -> str:
    return f"motor-parts/{part_id}"


def _assembly_key(assembly_id: str) -> str:
    return f"motor-assemblies/{assembly_id}"


def _casting_supply_key(casting_supply_id: str) -> str:
    return f"casting-supplies/{casting_supply_id}"


def _reload_key(motor_reload_id: str) -> str:
    return f"motor-reloads/{motor_reload_id}"


# --- motor-parts helpers ----------------------------------------------------


def load_motor_part(store: ModelStore, part_id: str) -> MotorPartBase:
    """
    Load any motor part by part_id from the 'motor-parts/' directory.

    The caller is responsible for casting to CasePart, ClosurePart, or NozzlePart
    if they expect a specific subtype.
    """
    key = _parts_key(part_id)
    # We load as MotorPartBase to allow the caller to inspect part_type/role
    # before deciding how to handle it.
    return store.load_model(MotorPartBase, key)


def load_case_part(store: ModelStore, part_id: str) -> CasePart:
    """Load a CasePart from 'motor-parts/' given its part_id."""
    key = _parts_key(part_id)
    return store.load_model(CasePart, key)


def load_closure_part(store: ModelStore, part_id: str) -> ClosurePart:
    """Load a ClosurePart from 'motor-parts/' given its part_id."""
    key = _parts_key(part_id)
    return store.load_model(ClosurePart, key)


def load_nozzle_part(store: ModelStore, part_id: str) -> NozzlePart:
    """Load a NozzlePart from 'motor-parts/' given its part_id."""
    key = _parts_key(part_id)
    return store.load_model(NozzlePart, key)


def save_motor_part(store: ModelStore, part: MotorPartBase) -> None:
    """
    Save a motor part into the 'motor-parts/' directory.

    The JSON filename will match part.part_id with a .json suffix.
    """
    key = _parts_key(part.part_id)
    store.save_model(part, key)


# --- motor-assemblies helpers -----------------------------------------------


def load_motor_assembly(store: ModelStore, assembly_id: str) -> MotorAssembly:
    """Load a MotorAssembly from 'motor-assemblies/' given its assembly_id."""
    key = _assembly_key(assembly_id)
    return store.load_model(MotorAssembly, key)


def save_motor_assembly(store: ModelStore, assembly: MotorAssembly) -> None:
    """Save a MotorAssembly into the 'motor-assemblies/' directory."""
    key = _assembly_key(assembly.assembly_id)
    store.save_model(assembly, key)


# --- casting-supplies helpers -----------------------------------------------


def load_casting_supply(
    store: ModelStore,
    casting_supply_id: str,
) -> CastingSupply:
    """Load a CastingSupply from 'casting-supplies/' given its ID."""
    key = _casting_supply_key(casting_supply_id)
    return store.load_model(CastingSupply, key)


def save_casting_supply(
    store: ModelStore,
    casting_supply: CastingSupply,
) -> None:
    """Save a CastingSupply into the 'casting-supplies/' directory."""
    key = _casting_supply_key(casting_supply.casting_supply_id)
    store.save_model(casting_supply, key)


# --- motor-reloads helpers --------------------------------------------------


def load_motor_reload(store: ModelStore, motor_reload_id: str) -> MotorReload:
    """Load a MotorReload from 'motor-reloads/' given its ID."""
    key = _reload_key(motor_reload_id)
    return store.load_model(MotorReload, key)


def save_motor_reload(store: ModelStore, motor_reload: MotorReload) -> None:
    """Save a MotorReload into the 'motor-reloads/' directory."""
    key = _reload_key(motor_reload.motor_reload_id)
    store.save_model(motor_reload, key)

