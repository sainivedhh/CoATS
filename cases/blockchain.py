"""
blockchain.py — Pure Python hash-chain implementation.

No external dependencies, no wallet required.
Each CaseLog entry is already chained via block_hash / prev_hash in models.py.
This module provides utility functions for verification and display.
"""
import hashlib
import json


def compute_block_hash(index, case_id, updated_by, branch, field_changed,
                        old_value, new_value, prev_hash):
    """Recompute a block's SHA-256 hash from its content."""
    payload = json.dumps({
        "index":         index,
        "case_id":       str(case_id),
        "updated_by":    updated_by,
        "branch":        branch,
        "field_changed": field_changed,
        "old_value":     old_value,
        "new_value":     new_value,
        "prev_hash":     prev_hash,
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def verify_chain(logs):
    """
    Verify a list of CaseLog objects form an intact hash chain.
    Returns (chain_intact: bool, results: list[dict])
    """
    results = []
    chain_intact = True

    for i, log in enumerate(logs):
        recomputed = log.compute_hash()
        hash_valid = (log.block_hash == recomputed)
        link_valid = (log.prev_hash == "GENESIS") if i == 0 else (log.prev_hash == logs[i - 1].block_hash)
        valid = hash_valid and link_valid
        if not valid:
            chain_intact = False
        results.append({
            "block_index":   log.block_index,
            "hash_valid":    hash_valid,
            "link_valid":    link_valid,
            "valid":         valid,
            "expected_hash": recomputed,
            "stored_hash":   log.block_hash,
        })

    return chain_intact, results


# Legacy stub kept for import compatibility — does nothing
def store_case_log(case_id, officer, prev_stage, new_stage):
    """
    Previously attempted to write to Ethereum testnet.
    Now uses the built-in SHA-256 hash chain in CaseLog model instead.
    Returns a deterministic hash of the arguments as a transaction ID stub.
    """
    payload = f"{case_id}|{officer}|{prev_stage}|{new_stage}"
    return "0x" + hashlib.sha256(payload.encode()).hexdigest()
