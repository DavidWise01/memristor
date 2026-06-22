
// memristive_kernel_128.c
// 128-bit fixed-point kernel for Memristive Substrate Seed v2.0
// Implements logistic feedback: F_new = 1 + 4*u*(1-u), u = D/100
// Author: derived from David Lee Wise / TriPod LLC proof
// Compile: gcc -O2 -std=c11 -o kernel memristive_kernel_128.c -lm

#include <stdint.h>
#include <stdio.h>
#include <math.h>

typedef unsigned __int128 u128;
typedef __int128 i128;

#define Q 64
#define ONE ((u128)1 << Q)  // 1.0 in Q64.64

// Convert double to Q64.64
static inline u128 to_q(double x) { return (u128)(x * (double)ONE); }
static inline double from_q(u128 x) { return (double)x / (double)ONE; }

// 128-bit multiply with scaling
static inline u128 qmul(u128 a, u128 b) {
    __uint128_t prod = (__uint128_t)a * b;
    return (u128)(prod >> Q);
}

// Kernel state
typedef struct {
    uint64_t c;      // cycles
    u128 r;          // baseExtractionRate in Q64.64
    u128 D;          // topologicalDebt in Q64.64 (0-100)
} kernel_t;

// Initialize
void kernel_init(kernel_t *k, double r_init) {
    k->c = 0;
    k->r = to_q(r_init);  // r in [0.01,0.30]
    k->D = 0;
}

// One update step - returns feedback multiplier F_new in Q64.64
u128 kernel_step(kernel_t *k) {
    k->c++;
    
    // D = min((c * r)/600 , 100)
    // c is an integer cycle count, r is Q64.64 -> (c * r) is already Q64.64.
    // The old qmul((c<<Q), r) pre-shifted c into Q64.64 first, making the
    // intermediate product ~2^144 and overflowing __uint128_t (D froze at ~0).
    u128 cr = (u128)k->c * k->r; // c (integer) * r (Q64.64) -> Q64.64, no overflow
    u128 D_raw = cr / 600;
    u128 D_max = to_q(100.0);
    k->D = (D_raw > D_max) ? D_max : D_raw;
    
    // u = D/100  (Q64.64 divided by integer 100; avoids the qmul boundary
    // overflow that hit exactly at D=100)
    u128 u = k->D / 100;
    
    // F_new = 1 + 4*u*(1-u)
    u128 one_minus_u = ONE - u;
    u128 u_term = qmul(u, one_minus_u);
    u128 four_u = u_term << 2; // *4
    u128 F = ONE + four_u;
    
    return F;
}

// Example main: simulate 1.2M cycles
int main() {
    kernel_t k;
    kernel_init(&k, 0.05); // default r
    
    for (uint64_t i = 0; i < 1200000; i++) {
        u128 F = kernel_step(&k);
        if ((i % 100000) == 0) {
            printf("c=%llu D=%.4f F=%.4f\n",
                (unsigned long long)k.c,
                from_q(k.D),
                from_q(F));
        }
    }
    // D rises ~linearly with cycles ((c*r)/600) and clamps at D_max = 100.
    printf("Final: D=%.6f (clamped at D_max=100)\n", from_q(k.D));
    return 0;
}
