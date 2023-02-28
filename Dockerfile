FROM node:slim

# We don't need the standalone Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install Google Chrome Stable and fonts
# Note: this installs the necessary libs to make the browser work with Puppeteer.
RUN apt-get update && apt-get install gnupg wget -y && \
    wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /etc/apt/trusted.gpg.d/google-archive.gpg && \
    sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
    apt-get update && \
    apt-get install google-chrome-stable -y --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Create the bot directory
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot

# Copy package.json and install dependencies
COPY package.json /usr/src/bot
RUN npm install --production && npm install typescript -g

# Copy the bot source
COPY . /usr/src/bot

# Compile the bot and start it
RUN tsc
CMD ["npm", "run", "start:prod"]