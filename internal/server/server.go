// Package server implements the gRPC FingerPrint service.
// It translates between base64-encoded FMD data from gRPC clients
// and the native DigitalPersona dpfj library calls.
package server

import (
	"context"
	"encoding/base64"
	"log/slog"

	pb "go_uRu_4500_fingerprint_grpc/gen/fingerprint"
	"go_uRu_4500_fingerprint_grpc/pkg/dpfj"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// FingerPrintServer implements the gRPC FingerPrint service interface.
type FingerPrintServer struct {
	pb.UnimplementedFingerPrintServer
}

// NewFingerPrintServer creates a new FingerPrintServer instance.
func NewFingerPrintServer() *FingerPrintServer {
	return &FingerPrintServer{}
}

// EnrollFingerprint combines multiple pre-registered FMDs into a single enrolled FMD.
// The client sends base64-encoded pre-registered FMDs, and the server returns
// a base64-encoded enrolled FMD that can be stored and used for verification.
func (s *FingerPrintServer) EnrollFingerprint(ctx context.Context, req *pb.EnrollmentRequest) (*pb.EnrolledFMD, error) {
	slog.Info("enrollment request received", "candidate_count", len(req.GetFmdCandidates()))

	if len(req.GetFmdCandidates()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "no FMD candidates provided for enrollment")
	}

	// Check context before expensive operations
	if err := ctx.Err(); err != nil {
		return nil, status.FromContextError(err).Err()
	}

	// Decode all base64-encoded pre-registered FMDs
	preRegFMDs := make([][]byte, 0, len(req.GetFmdCandidates()))
	for i, candidate := range req.GetFmdCandidates() {
		raw := candidate.GetBase64PreEnrolledFMD()
		if raw == "" {
			return nil, status.Errorf(codes.InvalidArgument, "FMD candidate %d has empty base64 data", i)
		}

		decoded, err := base64.StdEncoding.DecodeString(raw)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "failed to decode FMD candidate %d: %v", i, err)
		}
		preRegFMDs = append(preRegFMDs, decoded)
	}

	// The native DPFJ library typically requires 4 FMDs for a successful enrollment.
	// If the frontend only provides fewer (e.g. for a 3-step UI), duplicate the last one.
	for len(preRegFMDs) > 0 && len(preRegFMDs) < 4 {
		preRegFMDs = append(preRegFMDs, preRegFMDs[len(preRegFMDs)-1])
	}

	// Perform enrollment using the dpfj library
	enrolledFMD, err := dpfj.Enroll(preRegFMDs)
	if err != nil {
		slog.Error("enrollment failed", "error", err)
		return nil, status.Errorf(codes.Internal, "fingerprint enrollment failed: %v", err)
	}

	// Encode the enrolled FMD back to base64
	encoded := base64.StdEncoding.EncodeToString(enrolledFMD)
	slog.Info("enrollment successful", "fmd_size", len(enrolledFMD))

	return &pb.EnrolledFMD{
		Base64EnrolledFMD: encoded,
	}, nil
}

// VerifyFingerprint checks if a target pre-registered FMD matches any of the
// enrolled FMD candidates. Returns true if a match is found.
func (s *FingerPrintServer) VerifyFingerprint(ctx context.Context, req *pb.VerificationRequest) (*pb.VerificationResponse, error) {
	slog.Info("verification request received", "candidate_count", len(req.GetFmdCandidates()))

	matched, err := s.performVerification(ctx, req)
	if err != nil {
		return nil, err // already a gRPC status error
	}

	slog.Info("verification complete", "matched", matched)

	return &pb.VerificationResponse{Match: matched}, nil
}

// CheckDuplicate checks if a fingerprint already exists in a set of enrolled candidates.
// Returns true if the fingerprint is a duplicate (i.e., a match was found).
func (s *FingerPrintServer) CheckDuplicate(ctx context.Context, req *pb.VerificationRequest) (*pb.CheckDuplicateResponse, error) {
	slog.Info("duplicate check request received", "candidate_count", len(req.GetFmdCandidates()))

	matched, err := s.performVerification(ctx, req)
	if err != nil {
		return nil, err // already a gRPC status error
	}

	slog.Info("duplicate check complete", "is_duplicate", matched)

	return &pb.CheckDuplicateResponse{IsDuplicate: matched}, nil
}

// performVerification is a shared helper that handles the actual fingerprint verification.
// Both VerifyFingerprint and CheckDuplicate use this function.
// It returns proper gRPC status errors.
func (s *FingerPrintServer) performVerification(ctx context.Context, req *pb.VerificationRequest) (bool, error) {
	if req.GetTargetFMD() == nil {
		return false, status.Error(codes.InvalidArgument, "no target FMD provided")
	}

	if len(req.GetFmdCandidates()) == 0 {
		return false, status.Error(codes.InvalidArgument, "no FMD candidates provided for verification")
	}

	// Check context before expensive operations
	if err := ctx.Err(); err != nil {
		return false, status.FromContextError(err).Err()
	}

	// Decode the target pre-registered FMD
	targetRaw := req.GetTargetFMD().GetBase64PreEnrolledFMD()
	if targetRaw == "" {
		return false, status.Error(codes.InvalidArgument, "target FMD has empty base64 data")
	}

	targetFMD, err := base64.StdEncoding.DecodeString(targetRaw)
	if err != nil {
		return false, status.Errorf(codes.InvalidArgument, "failed to decode target FMD: %v", err)
	}

	// Decode all enrolled FMD candidates
	enrolledFMDs := make([][]byte, 0, len(req.GetFmdCandidates()))
	for i, candidate := range req.GetFmdCandidates() {
		raw := candidate.GetBase64EnrolledFMD()
		if raw == "" {
			return false, status.Errorf(codes.InvalidArgument, "enrolled FMD candidate %d has empty base64 data", i)
		}

		decoded, err := base64.StdEncoding.DecodeString(raw)
		if err != nil {
			return false, status.Errorf(codes.InvalidArgument, "failed to decode enrolled FMD candidate %d: %v", i, err)
		}
		enrolledFMDs = append(enrolledFMDs, decoded)
	}

	// Perform verification using the dpfj library
	matched, err := dpfj.Verify(targetFMD, enrolledFMDs)
	if err != nil {
		slog.Error("verification failed", "error", err)
		return false, status.Errorf(codes.Internal, "fingerprint verification failed: %v", err)
	}

	return matched, nil
}
