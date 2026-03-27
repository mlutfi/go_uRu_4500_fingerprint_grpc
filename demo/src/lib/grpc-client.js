import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(process.cwd(), '..', 'proto', 'fingerprint.proto');

let client = null;
let clientUrl = null;

function getClient() {
  const url = process.env.GRPC_FINGERPRINT_URL || 'localhost:4134';

  // Recreate client if URL changed (e.g. env reloaded)
  if (client && clientUrl !== url) {
    client.close();
    client = null;
  }

  if (!client) {
    console.log('[gRPC] Connecting to fingerprint engine at:', url);
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const proto = grpc.loadPackageDefinition(packageDefinition);
    client = new proto.fingerprint.FingerPrint(
      url,
      grpc.credentials.createInsecure()
    );
    clientUrl = url;
  }
  return client;
}

/**
 * Enroll fingerprint - combine multiple pre-enrolled FMDs into one enrolled FMD
 * @param {string[]} fmdCandidates - Array of base64-encoded pre-enrolled FMDs
 * @returns {Promise<string>} - base64-encoded enrolled FMD
 */
export function enrollFingerprint(fmdCandidates) {
  return new Promise((resolve, reject) => {
    const request = {
      fmdCandidates: fmdCandidates.map(fmd => ({
        base64PreEnrolledFMD: fmd,
      })),
    };

    getClient().EnrollFingerprint(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.base64EnrolledFMD);
      }
    });
  });
}

/**
 * Verify fingerprint - check if target FMD matches any enrolled candidate
 * @param {string} targetFmd - base64-encoded pre-enrolled FMD to verify
 * @param {string[]} enrolledFmds - Array of base64-encoded enrolled FMDs
 * @returns {Promise<boolean>} - true if match found
 */
export function verifyFingerprint(targetFmd, enrolledFmds) {
  return new Promise((resolve, reject) => {
    const request = {
      targetFMD: {
        base64PreEnrolledFMD: targetFmd,
      },
      fmdCandidates: enrolledFmds.map(fmd => ({
        base64EnrolledFMD: fmd,
      })),
    };

    getClient().VerifyFingerprint(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.match);
      }
    });
  });
}

/**
 * Check duplicate fingerprint
 * @param {string} targetFmd - base64-encoded pre-enrolled FMD
 * @param {string[]} enrolledFmds - Array of base64-encoded enrolled FMDs  
 * @returns {Promise<boolean>} - true if duplicate found
 */
export function checkDuplicate(targetFmd, enrolledFmds) {
  return new Promise((resolve, reject) => {
    const request = {
      targetFMD: {
        base64PreEnrolledFMD: targetFmd,
      },
      fmdCandidates: enrolledFmds.map(fmd => ({
        base64EnrolledFMD: fmd,
      })),
    };

    getClient().CheckDuplicate(request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response.isDuplicate);
      }
    });
  });
}
