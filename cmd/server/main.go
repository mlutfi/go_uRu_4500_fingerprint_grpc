// gRPC Fingerprint Engine Server
// A Go reimplementation of the DigitalPersona fingerprint engine gRPC wrapper.
//
// This server exposes fingerprint enrollment, verification, and duplicate-checking
// functionality via gRPC, backed by the DigitalPersona dpfj native library.
//
// Environment Variables:
//
//	PORT - The port to listen on (default: 4134)
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	pb "go_uRu_4500_fingerprint_grpc/gen/fingerprint"
	"go_uRu_4500_fingerprint_grpc/internal/server"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	defaultPort         = "4134"
	gracefulStopTimeout = 10 * time.Second
)

func main() {
	// Set up structured JSON logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	address := fmt.Sprintf("0.0.0.0:%s", port)

	lis, err := net.Listen("tcp", address)
	if err != nil {
		slog.Error("failed to listen", "address", address, "error", err)
		os.Exit(1)
	}

	grpcServer := grpc.NewServer(
		// Keepalive parameters for robust connection management
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionIdle:     5 * time.Minute,  // Close idle connections after 5 min
			MaxConnectionAge:      30 * time.Minute,  // Force reconnect after 30 min
			MaxConnectionAgeGrace: 10 * time.Second,  // Grace period for pending RPCs
			Time:                  2 * time.Minute,   // Ping client every 2 min
			Timeout:               20 * time.Second,  // Wait 20s for ping ack
		}),
		grpc.KeepaliveEnforcementPolicy(keepalive.EnforcementPolicy{
			MinTime:             30 * time.Second, // Min time between client pings
			PermitWithoutStream: true,             // Allow pings without active streams
		}),
		// Unary interceptor chain: recovery + logging
		grpc.ChainUnaryInterceptor(
			recoveryInterceptor,
			loggingInterceptor,
		),
	)

	// Register the FingerPrint service
	fpServer := server.NewFingerPrintServer()
	pb.RegisterFingerPrintServer(grpcServer, fpServer)

	// Register gRPC health check service
	healthServer := health.NewServer()
	healthpb.RegisterHealthServer(grpcServer, healthServer)
	healthServer.SetServingStatus("fingerprint.FingerPrint", healthpb.HealthCheckResponse_SERVING)
	healthServer.SetServingStatus("", healthpb.HealthCheckResponse_SERVING)

	// Enable gRPC reflection for tools like grpcurl
	reflection.Register(grpcServer)

	// Graceful shutdown on SIGINT/SIGTERM
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		<-ctx.Done()
		slog.Info("shutdown signal received, draining connections...", "timeout", gracefulStopTimeout)

		// Mark health as NOT_SERVING so load balancers stop sending traffic
		healthServer.SetServingStatus("fingerprint.FingerPrint", healthpb.HealthCheckResponse_NOT_SERVING)
		healthServer.SetServingStatus("", healthpb.HealthCheckResponse_NOT_SERVING)

		// Create a deadline for graceful shutdown
		shutdownTimer := time.AfterFunc(gracefulStopTimeout, func() {
			slog.Warn("graceful shutdown timed out, forcing stop")
			grpcServer.Stop()
		})
		defer shutdownTimer.Stop()

		grpcServer.GracefulStop()
		slog.Info("server stopped gracefully")
	}()

	slog.Info("server started", "address", address)

	if err := grpcServer.Serve(lis); err != nil {
		slog.Error("server terminated", "error", err)
		os.Exit(1)
	}
}

// recoveryInterceptor catches panics in gRPC handlers and returns an Internal
// error instead of crashing the entire server process.
func recoveryInterceptor(
	ctx context.Context,
	req any,
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (resp any, err error) {
	defer func() {
		if r := recover(); r != nil {
			slog.Error("panic recovered in gRPC handler",
				"method", info.FullMethod,
				"panic", fmt.Sprintf("%v", r),
			)
			err = status.Errorf(
				codes.Internal,
				"internal server error",
			)
		}
	}()
	return handler(ctx, req)
}

// loggingInterceptor logs every unary RPC call with method, duration, and status.
func loggingInterceptor(
	ctx context.Context,
	req any,
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (any, error) {
	start := time.Now()

	resp, err := handler(ctx, req)

	duration := time.Since(start)
	code := status.Code(err)

	if err != nil {
		slog.Warn("rpc completed",
			"method", info.FullMethod,
			"duration_ms", duration.Milliseconds(),
			"code", code.String(),
			"error", err.Error(),
		)
	} else {
		slog.Info("rpc completed",
			"method", info.FullMethod,
			"duration_ms", duration.Milliseconds(),
			"code", code.String(),
		)
	}

	return resp, err
}
