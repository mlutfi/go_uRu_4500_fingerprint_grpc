$ErrorActionPreference = "Stop"

Write-Host "Downloading protoc..."
Invoke-WebRequest -Uri "https://github.com/protocolbuffers/protobuf/releases/download/v29.3/protoc-29.3-win64.zip" -OutFile "protoc.zip"
Write-Host "Extracting protoc..."
Expand-Archive -Path "protoc.zip" -DestinationPath "protoc" -Force

Write-Host "Installing Go plugins..."
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

Write-Host "Updating PATH..."
$env:PATH += ";$PWD\protoc\bin;$env:USERPROFILE\go\bin"

Write-Host "Generating protobuf code..."
protoc --go_out=. --go-grpc_out=. proto/fingerprint.proto

Write-Host "Done!"
