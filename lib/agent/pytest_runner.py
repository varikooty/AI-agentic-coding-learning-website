"""Runs pytest against the sandbox dir with POSIX rlimits as a safety net.

No Docker here — see pytestRunner.ts for why. RLIMIT_AS caps virtual
address space, not resident memory, so it's deliberately set well above
the old container's --memory=256m: pytest + its plugins can reserve a lot
of address space (shared libs, mmap'd files) without actually using much
physical memory, and a tight RLIMIT_AS just makes pytest itself crash on
import. This is a coarser net than a cgroup memory limit, not an
equivalent one.
"""
import os
import resource
import sys

MEMORY_BYTES = 512 * 1024 * 1024
CPU_SECONDS = 10
MAX_PROCS = 64


def main() -> int:
    sandbox_dir = sys.argv[1]

    resource.setrlimit(resource.RLIMIT_AS, (MEMORY_BYTES, MEMORY_BYTES))
    resource.setrlimit(resource.RLIMIT_CPU, (CPU_SECONDS, CPU_SECONDS))
    try:
        resource.setrlimit(resource.RLIMIT_NPROC, (MAX_PROCS, MAX_PROCS))
    except (ValueError, OSError):
        pass  # some hosts already sit above this limit for the whole uid

    os.chdir(sandbox_dir)

    import pytest

    return pytest.main(["-q"])


if __name__ == "__main__":
    sys.exit(main())
