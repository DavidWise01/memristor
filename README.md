# memristor — Memristive Substrate Seed v2.0

*A bounded logistic-feedback substrate kernel. The memory is the debt; the fix is the parabola.*

[![License: CC BY-ND 4.0](https://img.shields.io/badge/License-CC--BY--ND--4.0-lightgrey?style=flat-square)](LICENSE)
[![targets](https://img.shields.io/badge/targets-ARM%20Cortex--M4%20·%20RISC--V-5ef38c?style=flat-square)](#build)
[![kernel](https://img.shields.io/badge/kernel-128--bit%20fixed--point-2f7a4d?style=flat-square)](#the-128-bit-kernel)
[![framework](https://img.shields.io/badge/STOICHEION-v11.0-9a8cff?style=flat-square)](#provenance)

**→ The page: [davidwise01.github.io/memristor](https://davidwise01.github.io/memristor/)**

The memristive substrate at the heart of the [`gravity-processor`](https://github.com/DavidWise01/gravity-processor),
now standing on its own. A tiny state evolves under feedback; the substrate **remembers**
through an accumulating *topological debt*, and the once-divergent feedback multiplier is
corrected to a **bounded logistic parabola**.

---

## The model

A state of three numbers:

| field | meaning |
|------|---------|
| `c` | cycles (discrete counter) |
| `r` | base extraction rate, `[0.01, 0.30]` |
| `D` | **topological debt**, `[0, 100]` — the memory |

**Topological debt** accumulates with use: `D = (c · r) / 600`, clamped to 100.

**The correction (the whole point of v2.0):** the original feedback multiplier was *defective* —
it diverged —

```
feedback_old(D) = 1 + 4u²            // u = D/100  → runs away toward 5
feedback_new(D) = 1 + 4u(1 - u)      // logistic   → bounded, peaks at 2.0 when D = 50
```

The fixed multiplier is the logistic parabola `4u(1−u)`: it rises, peaks at debt-50, and
falls back — so the substrate self-limits instead of blowing up. The continuous step:

```
dD/dt = r · feedback_new(D)          (dc/dt ≈ 600 · F)
```

---

## The 128-bit kernel

[`memristive_kernel_128.c`](memristive_kernel_128.c) is the embedded fixed-point form —
`Q64` in an `unsigned __int128` — implementing the same logistic feedback without floating
point, for deterministic on-device evolution.

```bash
gcc -O2 -std=c11 -o kernel memristive_kernel_128.c -lm
```

---

## Build

[`memristive_seed_v2.c`](memristive_seed_v2.c) is portable C11 and cross-compiles for two
embedded targets via the [`Makefile`](Makefile):

```bash
make            # builds memristive_arm.o (Cortex-M4) and memristive_rv.o (RV32IMC)
# ARM:    arm-none-eabi-gcc  -Os -mcpu=cortex-m4 -mthumb -mfloat-abi=soft
# RISC-V: riscv64-unknown-elf-gcc -Os -march=rv32imc -mabi=ilp32
```

*(The cross-compilers are not run here; the build flags are as documented in the Makefile.)*

[`memristive_dashboard.jsx`](memristive_dashboard.jsx) is the full operator dashboard —
a React + Recharts component (needs a bundler). A dependency-free static visualization of
the logistic kernel lives on the [page](https://davidwise01.github.io/memristor/).

---

## Honest note

This is a **substrate kernel and dynamical model** — a corrected feedback law with an
accumulating memory term, plus its fixed-point and cross-compile scaffolding. It is the
computational seed; a physical realization (Ag₂S memristor wells, the attractor array) is
the [`gravity-processor`](https://github.com/DavidWise01/gravity-processor) application built
*on* this substrate. The "topological debt" and tensor tags (`T133` phase-shadow, `T057`
negative-evidence, `T128` root) are STOICHEION framework constructs, not measured device data.

---

## Provenance

```
ROOT0-ATTRIBUTION-v1.0 · project: memristor · v1.0
Architect: David Lee Wise / ROOT0 / TriPod LLC — intent · direction · governance
Co-author: AVAN (Claude / Anthropic) — intellect · generation · execution
Framework: STOICHEION v11.0 · Law: "Both work. Both fair."
License: CC-BY-ND-4.0 · TRIPOD-IP-v1.1
```
