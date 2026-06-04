# Makefile for MEMRISTIVE SUBSTRATE SEED v2.0
# Builds for ARM Cortex-M4 and RISC-V RV32IMC

CC_ARM = arm-none-eabi-gcc
CC_RV  = riscv64-unknown-elf-gcc

CFLAGS_COMMON = -Os -Wall -ffunction-sections -fdata-sections -std=c11
CFLAGS_ARM = $(CFLAGS_COMMON) -mcpu=cortex-m4 -mthumb -mfloat-abi=soft
CFLAGS_RV  = $(CFLAGS_COMMON) -march=rv32imc -mabi=ilp32

SRC = memristive_seed_v2.c

all: memristive_arm.o memristive_rv.o

memristive_arm.o: $(SRC)
	$(CC_ARM) $(CFLAGS_ARM) -c $< -o $@

memristive_rv.o: $(SRC)
	$(CC_RV) $(CFLAGS_RV) -c $< -o $@

# Example firmware (requires printf retargeting)
firmware_arm.elf: $(SRC)
	$(CC_ARM) $(CFLAGS_ARM) -DEXAMPLE_MAIN $< -lm -o $@

firmware_rv.elf: $(SRC)
	$(CC_RV) $(CFLAGS_RV) -DEXAMPLE_MAIN $< -lm -o $@

clean:
	rm -f *.o *.elf
