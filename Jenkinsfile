
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

        stage('Frontend CI') {
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

                        Write-Output 'Credential binding check passed; secret value not displayed.'
                    '''
                }
            }
        }

        stage('Docker Build and Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds-new',
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_TOKEN'
                )]) {
                    powershell '''
                        & "C:\Program Files\Git\usr\bin\bash.exe" -lc 'printf "%s" "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin'
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        & "C:\Program Files\Git\usr\bin\bash.exe" -lc "docker compose -f compose.yml build"
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                        & "C:\Program Files\Git\usr\bin\bash.exe" -lc "docker tag event-booking-system-frontend:latest jpraveen97/event-booking-system-frontend:latest && docker tag event-booking-system-backend:latest jpraveen97/event-booking-system-backend:latest && docker push jpraveen97/event-booking-system-frontend:latest && docker push jpraveen97/event-booking-system-backend:latest"
                        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Event Booking System CI/CD pipeline completed successfully.'
        }

        failure {
            echo 'Event Booking System CI failed. Check the stage logs.'
        }
    }
}
