# =============================================================================
# Automated Build & Push Script for AWS ECS / ECR (Insta Token Backend)
# =============================================================================

param (
    [string]$AwsRegion = "ap-south-2",
    [string]$AwsAccountId = "710280691369",
    [string]$RepoName = "instatoken-backend",
    [string]$ImageTag = "latest"
)

$EcrUri = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com/$RepoName"

Write-Host "🔐 Authenticating Docker to Amazon ECR ($AwsRegion)..." -ForegroundColor Cyan
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"

Write-Host "🐳 Building Docker image: $RepoName:$ImageTag..." -ForegroundColor Cyan
docker build -t "$RepoName:$ImageTag" -f Dockerfile .

Write-Host "🏷️ Tagging image for ECR: $EcrUri:$ImageTag..." -ForegroundColor Cyan
docker tag "$RepoName:$ImageTag" "$EcrUri:$ImageTag"

Write-Host "🚀 Pushing image to Amazon ECR ($EcrUri)..." -ForegroundColor Cyan
docker push "$EcrUri:$ImageTag"

Write-Host "🎉 Successfully pushed image to AWS ECR!" -ForegroundColor Green
Write-Host "👉 You can now update your ECS Service task to use: $EcrUri:$ImageTag" -ForegroundColor Yellow
