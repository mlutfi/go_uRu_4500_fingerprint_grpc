// Package dpfj provides Go bindings for the DigitalPersona libdpfj C library.
// It wraps the native fingerprint enrollment, verification, and identification functions
// using CGo to call the shared library directly.
//
// Thread Safety: Enrollment operations (StartEnrollment, AddToEnrollment,
// CreateEnrollmentFMD, FinishEnrollment) share global state in the C library
// and are protected by an internal mutex. The high-level Enroll function is
// safe for concurrent use; however, callers must not mix low-level enrollment
// calls from separate goroutines.
package dpfj

/*
#cgo LDFLAGS: -ldpfj
#include <stdlib.h>
#include <string.h>

// DigitalPersona dpfj definitions
// These mirror the dpfj.h header from the DigitalPersona SDK

#define DPFJ_SUCCESS 0
#define DPFJ_E_MORE_DATA 0x05000005
#define DPFJ_E_INVALID_PARAMETER 0x05000004

#define DPFJ_FMD_DP_PRE_REG_FEATURES 0
#define DPFJ_FMD_DP_REG_FEATURES 1
#define DPFJ_FMD_DP_VER_FEATURES 2

#define DPFJ_PROBABILITY_ONE 0x7FFFFFFF

#define MY_MAX_FMD_SIZE 65536

typedef unsigned int DPFJ_FMD_FORMAT;

typedef struct {
    unsigned int fmd_idx;
    unsigned int view_idx;
} DPFJ_CANDIDATE;

// Function declarations for dpfj library
extern int dpfj_start_enrollment(DPFJ_FMD_FORMAT fmd_format);
extern int dpfj_add_to_enrollment(DPFJ_FMD_FORMAT fmd_format, unsigned char* fmd, unsigned int fmd_size, unsigned int view_idx);
extern int dpfj_create_enrollment_fmd(unsigned char* fmd, unsigned int* fmd_size);
extern int dpfj_finish_enrollment();
extern int dpfj_identify(
    DPFJ_FMD_FORMAT ver_fmd_format,
    unsigned char* ver_fmd,
    unsigned int ver_fmd_size,
    unsigned int ver_view_idx,
    DPFJ_FMD_FORMAT reg_fmd_format,
    unsigned int reg_fmd_cnt,
    unsigned char** reg_fmds,
    unsigned int* reg_fmd_sizes,
    unsigned int threshold_score,
    unsigned int* candidate_cnt,
    DPFJ_CANDIDATE* candidates
);
extern int dpfj_fmd_convert(
    DPFJ_FMD_FORMAT in_fmd_format,
    unsigned char* in_fmd,
    unsigned int in_fmd_size,
    DPFJ_FMD_FORMAT out_fmd_format,
    unsigned char* out_fmd,
    unsigned int* out_fmd_size
);
*/
import "C"

import (
	"fmt"
	"sync"
	"unsafe"
)

const (
	// FMD format constants
	FMDFormatPreReg = C.DPFJ_FMD_DP_PRE_REG_FEATURES
	FMDFormatReg    = C.DPFJ_FMD_DP_REG_FEATURES
	FMDFormatVer    = C.DPFJ_FMD_DP_VER_FEATURES

	// Result constants
	Success         = C.DPFJ_SUCCESS
	ErrMoreData     = C.DPFJ_E_MORE_DATA
	ErrInvalidParam = C.DPFJ_E_INVALID_PARAMETER

	// Probability constant
	ProbabilityOne = C.DPFJ_PROBABILITY_ONE

	// MaxFMDSize is the maximum buffer size for FMD data.
	MaxFMDSize = C.MY_MAX_FMD_SIZE
)

// ThresholdScore is the default threshold for fingerprint matching.
// DPFJ_PROBABILITY_ONE / 1000000 means ~1 in a million false accept rate.
var ThresholdScore = uint32(ProbabilityOne / 1000000)

// enrollMu protects the stateful enrollment session in the C library.
// The dpfj enrollment functions use global state internally, so only one
// enrollment can be in progress at a time.
var enrollMu sync.Mutex

// DPFJError represents an error returned by the DigitalPersona dpfj library.
type DPFJError struct {
	Function string // the C function that failed
	Code     int    // the native error code
}

// Error implements the error interface.
func (e *DPFJError) Error() string {
	return fmt.Sprintf("dpfj: %s failed with code 0x%08X (%d)", e.Function, e.Code, e.Code)
}

// newDPFJError creates a DPFJError for the given function and C result code.
func newDPFJError(function string, result C.int) *DPFJError {
	return &DPFJError{Function: function, Code: int(result)}
}

// StartEnrollment begins a new fingerprint enrollment session.
// Callers must hold enrollMu or use the high-level Enroll function.
func StartEnrollment() error {
	result := C.dpfj_start_enrollment(C.DPFJ_FMD_DP_REG_FEATURES)
	if result != C.DPFJ_SUCCESS {
		return newDPFJError("dpfj_start_enrollment", result)
	}
	return nil
}

// AddToEnrollment adds a pre-registered FMD to the current enrollment session.
// Returns true if more data is needed, false if enrollment is ready.
func AddToEnrollment(fmdData []byte) (needsMore bool, err error) {
	if len(fmdData) == 0 {
		return false, &DPFJError{Function: "dpfj_add_to_enrollment", Code: int(ErrInvalidParam)}
	}

	fmdPtr := (*C.uchar)(unsafe.Pointer(&fmdData[0]))
	fmdSize := C.uint(len(fmdData))

	result := C.dpfj_add_to_enrollment(
		C.DPFJ_FMD_DP_PRE_REG_FEATURES,
		fmdPtr,
		fmdSize,
		0,
	)

	switch result {
	case C.DPFJ_E_MORE_DATA:
		return true, nil
	case C.DPFJ_SUCCESS:
		return false, nil
	default:
		return false, newDPFJError("dpfj_add_to_enrollment", result)
	}
}

// CreateEnrollmentFMD creates the final enrolled FMD from the current enrollment session.
func CreateEnrollmentFMD() ([]byte, error) {
	fmd := make([]byte, MaxFMDSize)
	fmdSize := C.uint(MaxFMDSize)

	result := C.dpfj_create_enrollment_fmd(
		(*C.uchar)(unsafe.Pointer(&fmd[0])),
		&fmdSize,
	)

	switch result {
	case C.DPFJ_SUCCESS:
		return fmd[:fmdSize], nil
	case C.DPFJ_E_MORE_DATA:
		return nil, &DPFJError{Function: "dpfj_create_enrollment_fmd", Code: int(ErrMoreData)}
	default:
		return nil, newDPFJError("dpfj_create_enrollment_fmd", result)
	}
}

// FinishEnrollment ends the current enrollment session and frees any
// resources held by the C library.
func FinishEnrollment() {
	C.dpfj_finish_enrollment()
}

// ConvertFMD converts an FMD from one format to another.
func ConvertFMD(inputFormat, outputFormat uint32, inputFMD []byte) ([]byte, error) {
	if len(inputFMD) == 0 {
		return nil, &DPFJError{Function: "dpfj_fmd_convert", Code: int(ErrInvalidParam)}
	}

	outputFMD := make([]byte, MaxFMDSize)
	outputSize := C.uint(MaxFMDSize)

	result := C.dpfj_fmd_convert(
		C.DPFJ_FMD_FORMAT(inputFormat),
		(*C.uchar)(unsafe.Pointer(&inputFMD[0])),
		C.uint(len(inputFMD)),
		C.DPFJ_FMD_FORMAT(outputFormat),
		(*C.uchar)(unsafe.Pointer(&outputFMD[0])),
		&outputSize,
	)

	if result != C.DPFJ_SUCCESS {
		return nil, newDPFJError("dpfj_fmd_convert", result)
	}

	return outputFMD[:outputSize], nil
}

// Identify matches a verification FMD against a set of registered FMD candidates.
// Returns the number of matches found.
func Identify(verFMD []byte, regFMDs [][]byte) (int, error) {
	if len(verFMD) == 0 {
		return 0, &DPFJError{Function: "dpfj_identify", Code: int(ErrInvalidParam)}
	}
	if len(regFMDs) == 0 {
		return 0, fmt.Errorf("dpfj: no candidate FMDs provided for identification")
	}

	candidateCount := len(regFMDs)

	// Allocate C arrays for candidate FMDs
	cFMDPtrs := make([]*C.uchar, candidateCount)
	cFMDSizes := make([]C.uint, candidateCount)

	for i, fmd := range regFMDs {
		if len(fmd) == 0 {
			return 0, fmt.Errorf("dpfj: candidate FMD at index %d is empty", i)
		}
		cFMDPtrs[i] = (*C.uchar)(unsafe.Pointer(&fmd[0]))
		cFMDSizes[i] = C.uint(len(fmd))
	}

	matchedCandidates := make([]C.DPFJ_CANDIDATE, 1)
	expectedMatches := C.uint(1)

	result := C.dpfj_identify(
		C.DPFJ_FMD_DP_VER_FEATURES,
		(*C.uchar)(unsafe.Pointer(&verFMD[0])),
		C.uint(len(verFMD)),
		0,
		C.DPFJ_FMD_DP_REG_FEATURES,
		C.uint(candidateCount),
		(**C.uchar)(unsafe.Pointer(&cFMDPtrs[0])),
		(*C.uint)(unsafe.Pointer(&cFMDSizes[0])),
		C.uint(ThresholdScore),
		&expectedMatches,
		&matchedCandidates[0],
	)

	if result != C.DPFJ_SUCCESS {
		return 0, newDPFJError("dpfj_identify", result)
	}

	return int(expectedMatches), nil
}

// Enroll performs a complete fingerprint enrollment from a set of pre-registered FMDs.
// This is a high-level convenience function that wraps StartEnrollment, AddToEnrollment,
// CreateEnrollmentFMD, and FinishEnrollment. It is safe for concurrent use.
func Enroll(preRegFMDs [][]byte) ([]byte, error) {
	if len(preRegFMDs) == 0 {
		return nil, fmt.Errorf("dpfj: no pre-registered FMDs provided for enrollment")
	}

	enrollMu.Lock()
	defer enrollMu.Unlock()

	if err := StartEnrollment(); err != nil {
		return nil, fmt.Errorf("failed to start enrollment: %w", err)
	}
	defer FinishEnrollment()

	for _, fmd := range preRegFMDs {
		needsMore, err := AddToEnrollment(fmd)
		if err != nil {
			return nil, fmt.Errorf("failed to add FMD to enrollment: %w", err)
		}

		if !needsMore {
			// Ready to create enrollment FMD
			enrolledFMD, err := CreateEnrollmentFMD()
			if err != nil {
				return nil, fmt.Errorf("failed to create enrollment FMD: %w", err)
			}
			return enrolledFMD, nil
		}
	}

	// If we get here, we ran out of FMDs before enrollment was complete
	// Try to create the enrollment FMD anyway
	enrolledFMD, err := CreateEnrollmentFMD()
	if err != nil {
		return nil, fmt.Errorf("enrollment incomplete, failed to create FMD: %w", err)
	}
	return enrolledFMD, nil
}

// Verify checks if a pre-registered FMD matches any of the enrolled FMD candidates.
// It first converts the pre-registered FMD to verification format, then runs identification.
func Verify(preRegFMD []byte, enrolledFMDs [][]byte) (bool, error) {
	if len(preRegFMD) == 0 {
		return false, fmt.Errorf("dpfj: empty pre-registered FMD provided for verification")
	}

	// Convert pre-registered FMD to verification format
	verFMD, err := ConvertFMD(FMDFormatPreReg, FMDFormatVer, preRegFMD)
	if err != nil {
		return false, fmt.Errorf("failed to convert FMD to verification format: %w", err)
	}

	matchCount, err := Identify(verFMD, enrolledFMDs)
	if err != nil {
		return false, fmt.Errorf("identification failed: %w", err)
	}

	return matchCount > 0, nil
}
