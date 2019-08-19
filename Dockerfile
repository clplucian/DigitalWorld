FROM debian:stretch-slim
COPY . /build
WORKDIR /build
RUN apt-get update
RUN apt-get install -y curl
RUN curl -L https://github.com/gohugoio/hugo/releases/download/v0.57.2/hugo_0.57.2_Linux-32bit.tar.gz --output hugo.tar.gz
RUN tar -xvzf hugo.tar.gz
ENTRYPOINT ./hugo server --bind 0.0.0.0 -p 80 --log --debug
