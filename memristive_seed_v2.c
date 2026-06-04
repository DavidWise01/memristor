/*
 * MEMRISTIVE SUBSTRATE SEED v2.0
 * Logistic Correction to Quadratic Feedback Multiplier
 * T133:PHASE-SHADOW | T057:NEGATIVE-EVIDENCE | T128:ROOT
 * David Lee Wise | TriPod LLC | ROOT0 | 3/4/26
 *
 * Compiles for ARM Cortex-M and RISC-V RV32IMC
 * gcc -Os -Wall
 */

#include <stdint.h>
#include <math.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

typedef struct {
    double c;      // cycles (discrete counter)
    double r;      // baseExtractionRate [0.01, 0.30]
    double D;      // topologicalDebt [0, 100]
} mem_state_t;

// Clamp helper
static inline double clamp(double x, double lo, double hi) {
    return x < lo ? lo : (x > hi ? hi : x);
}

// 2.1 Topological Debt (unchanged)
double debt_from_cycles(double c, double r) {
    double D = (c * r) / 600.0;
    return D > 100.0 ? 100.0 : D;
}

// 2.2 Original defective (kept for reference)
double feedback_old(double D) {
    double u = D / 100.0;
    return 1.0 + 4.0 * u * u;
}

// 2.3 Logistic Correction (FIXED)
double feedback_new(double D) {
    double u = clamp(D / 100.0, 0.0, 1.0);
    return 1.0 + 4.0 * u * (1.0 - u); // peaks at 2.0 when D=50
}

// Continuous ODE step using logistic feedback
// dD/dt = r * F_new(D)
void mem_update(mem_state_t *s, double dt_seconds) {
    // Approximate cycles per second at 60fps baseline: dc/dt ≈ 600 * F
    double F = feedback_new(s->D);
    double dc = 600.0 * F * dt_seconds;
    s->c += dc;
    s->D = debt_from_cycles(s->c, s->r);
}

// Analytic solution for D(t) under logistic model
// Derived in proof: D(t) = 100 * u(t)
// u(t) = 0.5 + tanh(2*sqrt(2)*((r/100)*t + C)) / (2)
// with C = (1/(2*sqrt(2))) * atanh(-sqrt(2)/2)
double debt_analytic(double t, double r) {
    const double sqrt2 = 1.4142135623730951;
    const double C = (1.0/(2.0*sqrt2)) * atanh(-sqrt2/2.0); // ≈ -0.3063
    double x = 2.0 * sqrt2 * ((r/100.0) * t + C);
    double th = tanh(x);
    double u = 0.5 + th / (2.0); // because w = th/√2, u = w/√2 + 0.5 = th/2 +0.5
    if (u < 0) u = 0;
    if (u > 1) u = 1;
    return 100.0 * u;
}

// Example usage for ARM/RISC-V bare metal
#ifdef EXAMPLE_MAIN
#include <stdio.h>
int main(void) {
    mem_state_t s = { .c = 0, .r = 0.05, .D = 0 };
    for (int i = 0; i < 10; i++) {
        mem_update(&s, 1.0); // 1 second steps
        printf("t=%d  c=%.0f  D=%.2f  F=%.3f\n", i+1, s.c, s.D, feedback_new(s.D));
    }
    return 0;
}
#endif
