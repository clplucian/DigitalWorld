node {
    def srvc
    stage("Clone repository") {
        checkout scm
    }
    stage("Build image") {
        sh 'docker build -t img .'
    }
    stage("Push image") {
        sh 'docker login -u $DL_U -p $DL_P hub.usrp.ro'
        sh 'docker tag img hub.usrp.ro/ms-hugo:latest'
        sh 'docker push hub.usrp.ro/ms-hugo:latest'
    }
}