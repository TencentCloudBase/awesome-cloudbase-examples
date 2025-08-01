# Start from the code-server Debian base image
FROM codercom/code-server:4.9.0

USER coder

# Apply VS Code settings
COPY deploy-container/settings.json .local/share/code-server/User/settings.json

# Use bash shell
ENV SHELL=/bin/bash

# Install unzip + rclone (support for remote filesystem)
RUN sudo apt-get update && sudo apt-get install unzip -y

# Set the timezone to Asia/Shanghai
RUN echo "Asia/Shanghai" | sudo tee /etc/timezone && sudo dpkg-reconfigure --frontend noninteractive tzdata

RUN curl -O https://tcb.cloud.tencent.com/%20cloud-run-function-template-images/web-ide/rclone-v1.70.2-linux-amd64.zip && \
    unzip rclone-v1.70.2-linux-amd64.zip && \
    cd rclone-*-linux-amd64 && \
    sudo cp rclone /usr/bin/ && \
    sudo chown coder:coder /usr/bin/rclone && \
    sudo chmod 755 /usr/bin/rclone && \
    cd .. && \
    rm -rf rclone-v1.70.2-linux-amd64 rclone-v1.70.2-linux-amd64.zip

# Copy rclone tasks to /tmp, to potentially be used
COPY deploy-container/rclone-tasks.json /tmp/rclone-tasks.json

# Fix permissions for code-server
RUN sudo chown -R coder:coder /home/coder/.local

# You can add custom software and dependencies for your environment below
# -----------

# Install a VS Code extension:
# Note: we use a different marketplace than VS Code. See https://github.com/cdr/code-server/blob/main/docs/FAQ.md#differences-compared-to-vs-code
# RUN code-server --install-extension esbenp.prettier-vscode


# -----------

# Port
ENV PORT=8080

# Use our custom entrypoint script first
COPY deploy-container/entrypoint.sh /usr/bin/deploy-container-entrypoint.sh
RUN sudo chmod +x /usr/bin/deploy-container-entrypoint.sh
ENTRYPOINT ["/usr/bin/deploy-container-entrypoint.sh"]

