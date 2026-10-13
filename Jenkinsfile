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
            powershell '''
                & "C:\\Program Files\\Git\\usr\\bin\\bash.exe" -lc "cd client && npm ci && npm run lint && npm run build"
                if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            '''
        }
    }

    stage('Backend CI') {
        steps {
            powershell '''
                & "C:\\Program Files\\Git\\usr\\bin\\bash.exe" -lc "cd server && npm ci && node --check index.js"
                if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            '''
        }
    }

    stage('Docker Build and Push') {
        steps {
            withCredentials([usernamePassword(
                credentialsId: 'dockerhub-creds',
                usernameVariable: 'DOCKERHUB_USER',
                passwordVariable: 'DOCKERHUB_TOKEN'
            )]) {
                powershell '''
                    $env:DOCKERHUB_TOKEN | docker login -u $env:DOCKERHUB_USER --password-stdin
                    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                    & "C:\\Program Files\\Git\\usr\\bin\\bash.exe" -lc "docker compose -f compose.yml build"
                    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

                    & "C:\\Program Files\\Git\\usr\\bin\\bash.exe" -lc "docker tag event-booking-system-frontend:latest jpraveen97/event-booking-system-frontend:latest && docker tag event-booking-system-backend:latest jpraveen97/event-booking-system-backend:latest && docker push jpraveen97/event-booking-system-frontend:latest && docker push jpraveen97/event-booking-system-backend:latest"
                    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
                '''
            }
        }
    }
}

post {
    success {
        echo 'Event Booking System CI succeeded. Docker images pushed to Docker Hub.'
    }
    failure {
        echo 'Event Booking System CI failed. Check the stage logs.'
    }
}


}
