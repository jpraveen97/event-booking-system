
pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Check Changed Files') {
            steps {
                script {
                    def changedFiles = []

                    currentBuild.changeSets.each { changeSet ->
                        changeSet.items.each { item ->
                            item.affectedFiles.each { file ->
                                changedFiles.add(file.path)
                            }
                        }
                    }

                    env.GITOPS_ONLY = (
                        !changedFiles.isEmpty() &&
                        changedFiles.every { it.startsWith('gitops/') }
                    ) ? 'true' : 'false'

                    if (env.GITOPS_ONLY == 'true') {
                        echo 'GitOps-only commit detected. Skipping CI to prevent a build loop.'
                    } else {
                        echo 'Application changes detected. Running CI/CD.'
                    }
                }
            }
        }

        stage('Frontend CI') {
            when {
                expression { env.GITOPS_ONLY != 'true' }
            }
            steps {
                dir('client') {
                    powershell '''
                        npm ci
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        npm run build
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
                    '''
                }
            }
        }

        stage('Backend CI') {
            when {
                expression { env.GITOPS_ONLY != 'true' }
            }
            steps {
                dir('server') {
                    powershell '''
                        npm ci
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        node --check index.js
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
                    '''
                }
            }
        }

        stage('Docker Credential Diagnostic') {
            when {
                expression { env.GITOPS_ONLY != 'true' }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds-new',
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_TOKEN'
                )]) {
                    powershell '''
                        if ($env:DOCKERHUB_USER -ne 'jpraveen97') {
                            throw 'Docker Hub username binding is incorrect'
                        }

                        if ([string]::IsNullOrWhiteSpace($env:DOCKERHUB_TOKEN)) {
                            throw 'Docker Hub token binding is empty'
                        }

                        Write-Output 'Docker Hub credential check passed.'
                    '''
                }
            }
        }

        stage('Docker Build and Push') {
            when {
                expression { env.GITOPS_ONLY != 'true' }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds-new',
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_TOKEN'
                )]) {
                    powershell '''
                        $imageTag = "build-$env:BUILD_NUMBER"

                        $env:DOCKERHUB_TOKEN |
                            docker login --username $env:DOCKERHUB_USER --password-stdin
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        docker compose -f compose.yml build --no-cache frontend backend
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        docker tag event-booking-system-frontend:latest "jpraveen97/event-booking-system-frontend:$imageTag"
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        docker tag event-booking-system-backend:latest "jpraveen97/event-booking-system-backend:$imageTag"
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        docker tag event-booking-system-frontend:latest jpraveen97/event-booking-system-frontend:latest
                        docker tag event-booking-system-backend:latest jpraveen97/event-booking-system-backend:latest

                        docker push "jpraveen97/event-booking-system-frontend:$imageTag"
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        docker push "jpraveen97/event-booking-system-backend:$imageTag"
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        docker push jpraveen97/event-booking-system-frontend:latest
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        docker push jpraveen97/event-booking-system-backend:latest
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        Write-Output "Docker images pushed with tag $imageTag"
                    '''
                }
            }
        }

        stage('Update GitOps Manifests') {
            when {
                expression { env.GITOPS_ONLY != 'true' }
            }
            steps {
                powershell '''
                    $imageTag = "build-$env:BUILD_NUMBER"

                    $frontendFile = "gitops/event-booking/frontend-deployment.yaml"
                    $backendFile = "gitops/event-booking/backend-deployment.yaml"

                    if (!(Test-Path $frontendFile)) {
                        throw "Frontend manifest not found: $frontendFile"
                    }

                    if (!(Test-Path $backendFile)) {
                        throw "Backend manifest not found: $backendFile"
                    }

                    $frontendContent = Get-Content $frontendFile -Raw
                    $backendContent = Get-Content $backendFile -Raw

                    $frontendPattern = '(?m)^(\s*image:\s*)jpraveen97/event-booking-system-frontend:\S+\s*$'
                    $backendPattern = '(?m)^(\s*image:\s*)jpraveen97/event-booking-system-backend:\S+\s*$'

                    if ([regex]::Matches($frontendContent, $frontendPattern).Count -ne 1) {
                        throw 'Expected exactly one frontend image entry.'
                    }

                    if ([regex]::Matches($backendContent, $backendPattern).Count -ne 1) {
                        throw 'Expected exactly one backend image entry.'
                    }

                    $frontendContent = [regex]::Replace(
                        $frontendContent,
                        $frontendPattern,
                        [System.Text.RegularExpressions.MatchEvaluator]{
                            param($match)
                            $match.Groups[1].Value + "jpraveen97/event-booking-system-frontend:$imageTag"
                        }
                    )

                    $backendContent = [regex]::Replace(
                        $backendContent,
                        $backendPattern,
                        [System.Text.RegularExpressions.MatchEvaluator]{
                            param($match)
                            $match.Groups[1].Value + "jpraveen97/event-booking-system-backend:$imageTag"
                        }
                    )

                    Set-Content -Path $frontendFile -Value $frontendContent -Encoding utf8
                    Set-Content -Path $backendFile -Value $backendContent -Encoding utf8

                    Write-Output "GitOps manifests updated to $imageTag"
                '''
            }
        }

        stage('Commit and Push GitOps Changes') {
            when {
                expression { env.GITOPS_ONLY != 'true' }
            }
            steps {
                powershell '''
                    git config user.name "Jenkins GitOps Bot"
                    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                    git config user.email "jenkins-gitops-bot@users.noreply.github.com"
                    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                    git add gitops/event-booking/frontend-deployment.yaml gitops/event-booking/backend-deployment.yaml
                    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                    git diff --cached --quiet
                    $diffExitCode = $LASTEXITCODE

                    if ($diffExitCode -eq 0) {
                        Write-Output 'No GitOps changes to commit.'
                        exit 0
                    }

                    if ($diffExitCode -ne 1) {
                        exit $diffExitCode
                    }

                    git commit -m "Update Event Booking images to build-$env:BUILD_NUMBER"
                    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
                '''

                withCredentials([gitUsernamePassword(
                    credentialsId: 'github-gitops-creds',
                    gitToolName: 'Default'
                )]) {
                    powershell '''
                        git push origin HEAD:main
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Event Booking CI/CD pipeline completed successfully.'
        }

        failure {
            echo 'Event Booking CI/CD failed. Check the stage logs.'
        }
    }
}
