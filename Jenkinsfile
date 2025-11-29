// pipeline {
//     agent {
//         kubernetes {
//             yaml '''
// apiVersion: v1
// kind: Pod
// spec:
//   containers:

//   - name: node
//     image: node:18
//     command: ['cat']
//     tty: true

//   - name: sonar-scanner
//     image: sonarsource/sonar-scanner-cli
//     command: ['cat']
//     tty: true

//   - name: kubectl
//     image: bitnami/kubectl:latest
//     command: ['cat']
//     tty: true
//     securityContext:
//       runAsUser: 0
//       readOnlyRootFilesystem: false
//     env:
//     - name: KUBECONFIG
//       value: /kube/config
//     volumeMounts:
//     - name: kubeconfig-secret
//       mountPath: /kube/config
//       subPath: kubeconfig

//   - name: dind
//     image: docker:dind
//     args: ["--storage-driver=overlay2"]
//     securityContext:
//       privileged: true
//     env:
//     - name: DOCKER_TLS_CERTDIR
//       value: ""

//   volumes:
//   - name: kubeconfig-secret
//     secret:
//       secretName: kubeconfig-secret
// '''
//         }
//     }

//     environment {
//         SONAR_HOST = "http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000"
//         SONAR_AUTH = "sqp_f76073617cf71453b8ee311f9e0ca5fbdcf693c4"
//     }

//     stages {

//         /* -------------------------
//            CLEAN OLD DOCKERFILES
//            ------------------------- */
//         stage('Clean Old Workspace Dockerfile') {
//             steps {
//                 container('node') {
//                     sh '''
//                         echo "Deleting ALL existing Dockerfiles..."
//                         find . -name "Dockerfile" -type f -print -delete || true
//                         echo "Workspace cleaned."
//                     '''
//                 }
//             }
//         }

//         /* -------------------------
//            CHECKOUT REPOSITORY
//            ------------------------- */
//         stage('Checkout') {
//             steps {
//                 git url:'https://github.com/Prathmesh-Joshi/tracker.git', branch:'main'
//             }
//         }

//         stage('Prepare Project') {
//             steps {
//                 container('node') {
//                     sh '''
//                         echo "Project Structure:"
//                         ls -la
//                     '''
//                 }
//             }
//         }

//         /* -------------------------
//            BUILD DOCKER IMAGE
//            ------------------------- */
//         stage('Build Docker Image') {
//             steps {
//                 container('dind') {
//                     sh '''
//                         sleep 10
//                         echo "=== Building Tracker Docker Image ==="
//                         docker build -t tracker:latest .
//                     '''
//                 }
//             }
//         }

//         /* -------------------------
//            SONARQUBE ANALYSIS
//            ------------------------- */
//         stage('SonarQube Analysis') {
//             steps {
//                 container('sonar-scanner') {
//                     sh '''
//                         echo "Checking SonarQube..."
//                         curl -I ${SONAR_HOST} || echo "SonarQube not reachable, continuing..."
//                     '''

//                     sh '''
//                         sonar-scanner \
//                             -Dsonar.projectKey=2401078-tracker \
//                             -Dsonar.sources=. \
//                             -Dsonar.host.url=${SONAR_HOST} \
//                             -Dsonar.token=${SONAR_AUTH}
//                     '''
//                 }
//             }
//         }

//         /* -------------------------
//            LOGIN TO NEXUS
//            ------------------------- */
//         stage('Login to Nexus Registry') {
//             steps {
//                 container('dind') {
//                     sh '''
//                         echo "Logging in to Nexus Docker Registry..."
//                         docker login http://nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085 \
//                           -u student -p Imcc@2025
//                     '''
//                 }
//             }
//         }

//         /* -------------------------
//            PUSH IMAGE TO NEXUS
//            ------------------------- */
//         stage('Push Tracker Image to Nexus') {
//             steps {
//                 container('dind') {
//                     sh '''
//                         echo "Tagging Tracker image..."
//                         docker tag tracker:latest nexus.imcc.com:8082/2401078/tracker:v1

//                         echo "Pushing Tracker image to Nexus..."
//                         docker push nexus.imcc.com:8082/2401078/tracker:v1
//                     '''
//                 }
//             }
//         }

//         /* -------------------------
//            KUBERNETES DEPLOYMENT
//            ------------------------- */
//         stage('Deploy to Kubernetes') {
//             steps {
//                 container('kubectl') {
//                     sh '''
//                         echo "Deploying Tracker App to Kubernetes..."
//                         kubectl apply -f k8s/deployment.yaml -n 2401078
//                         kubectl apply -f k8s/service.yaml -n 2401078

//                         kubectl get all -n 2401078

//                         kubectl rollout status deployment/tracker-frontend-deployment -n 2401078 --timeout=120s
//                     '''
//                 }
//             }
//         }

//         /* -------------------------
//            DEBUG PODS
//            ------------------------- */
//         stage('Debug Pods') {
//             steps {
//                 container('kubectl') {
//                     sh '''
//                         echo "Listing Pods..."
//                         kubectl get pods -n 2401078

//                         echo "Describing Pods (first 200 lines)..."
//                         kubectl describe pods -n 2401078 | head -n 200
//                     '''
//                 }
//             }
//         }
//     }
// }


pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:

  - name: node
    image: node:18
    command: ['cat']
    tty: true

  - name: sonar-scanner
    image: sonarsource/sonar-scanner-cli
    command: ['cat']
    tty: true

  - name: kubectl
    image: bitnami/kubectl:latest
    command: ['cat']
    tty: true
    securityContext:
      runAsUser: 0
      readOnlyRootFilesystem: false
    env:
    - name: KUBECONFIG
      value: /kube/config
    volumeMounts:
    - name: kubeconfig-secret
      mountPath: /kube/config
      subPath: kubeconfig

  - name: dind
    image: docker:dind
    args:
      - "--storage-driver=overlay2"
      - "--insecure-registry=nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085"
    securityContext:
      privileged: true
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""

  volumes:
  - name: kubeconfig-secret
    secret:
      secretName: kubeconfig-secret
'''
        }
    }

    environment {
        SONAR_HOST = "http://my-sonarqube-sonarqube.sonarqube.svc.cluster.local:9000"
        SONAR_AUTH = "sqp_f76073617cf71453b8ee311f9e0ca5fbdcf693c4"

        NEXUS_HOST = "nexus-service-for-docker-hosted-registry.nexus.svc.cluster.local:8085"
        NEXUS_REPO = "2401078"
        NAMESPACE = "2401078"
    }

    stages {

        /* -------------------------
           CREATE NAMESPACE IF NOT EXISTS
        ------------------------- */
        stage('Create Namespace') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "Checking namespace ${NAMESPACE}..."
                        kubectl get namespace ${NAMESPACE} || kubectl create namespace ${NAMESPACE}
                    '''
                }
            }
        }

        /* -------------------------
           CLEAN OLD DOCKERFILES
        ------------------------- */
        stage('Clean Old Workspace Dockerfile') {
            steps {
                container('node') {
                    sh '''
                        find . -name "Dockerfile" -type f -print -delete || true
                        echo "Workspace cleaned."
                    '''
                }
            }
        }

        /* -------------------------
           CHECKOUT SOURCE CODE
        ------------------------- */
        stage('Checkout') {
            steps {
                git url:'https://github.com/Prathmesh-Joshi/tracker.git', branch:'main'
            }
        }

        /* -------------------------
           PREPARE PROJECT
        ------------------------- */
        stage('Prepare Project') {
            steps {
                container('node') {
                    sh 'ls -la'
                }
            }
        }

        /* -------------------------
           BUILD DOCKER IMAGE
        ------------------------- */
        stage('Build Docker Image') {
            steps {
                container('dind') {
                    sh '''
                        sleep 10
                        echo "Building Docker Image..."
                        docker build -t tracker:latest .
                    '''
                }
            }
        }

        /* -------------------------
           SONAR SCAN
        ------------------------- */
        stage('SonarQube Analysis') {
            steps {
                container('sonar-scanner') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=2401078-tracker \
                          -Dsonar.sources=. \
                          -Dsonar.host.url=${SONAR_HOST} \
                          -Dsonar.token=${SONAR_AUTH}
                    '''
                }
            }
        }

        /* -------------------------
           NEXUS LOGIN
        ------------------------- */
        stage('Login to Nexus Registry') {
            steps {
                container('dind') {
                    sh '''
                        echo "Logging in to INTERNAL Nexus..."
                        docker login ${NEXUS_HOST} -u student -p Imcc@2025
                    '''
                }
            }
        }

        /* -------------------------
           PUSH IMAGE
        ------------------------- */
        stage('Push Tracker Image to Nexus') {
            steps {
                container('dind') {
                    sh '''
                        echo "Tagging Tracker image..."
                        docker tag tracker:latest ${NEXUS_HOST}/${NEXUS_REPO}/tracker:v1

                        echo "Pushing Tracker image..."
                        docker push ${NEXUS_HOST}/${NEXUS_REPO}/tracker:v1
                    '''
                }
            }
        }

        /* -------------------------
           KUBERNETES DEPLOYMENT
        ------------------------- */
        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    sh '''
                        echo "Applying Deployment and Service..."
                        kubectl apply -f k8s/deployment.yaml -n ${NAMESPACE}
                        kubectl apply -f k8s/service.yaml -n ${NAMESPACE}

                        echo "===== Rollout Status ====="
                        kubectl rollout status deployment/tracker -n ${NAMESPACE} --timeout=120s
                    '''
                }
            }
        }

        /* -------------------------
           DEBUG PODS
        ------------------------- */
        stage('Debug Pods') {
            steps {
                container('kubectl') {
                    sh '''
                        kubectl get pods -n ${NAMESPACE}
                        kubectl describe pods -n ${NAMESPACE} | head -n 200
                    '''
                }
            }
        }
    }
}
