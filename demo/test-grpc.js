import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(process.cwd(), '..', 'proto', 'fingerprint.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition);
const client = new proto.fingerprint.FingerPrint(
  'localhost:4134',
  grpc.credentials.createInsecure()
);

const request = {
  targetFMD: { base64PreEnrolledFMD: "test-fmd" },
  fmdCandidates: []
};

client.VerifyFingerprint(request, (error, response) => {
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Response:", response);
  }
});
