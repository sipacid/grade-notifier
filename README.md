# grade-notifier

Notifies you when you have a new grade on peoplesoft (Inholland)

## Table of Contents

- [Usage](#usage)
- [License](#license)

## Usage

To start the project use the following command

```bash
docker run -d \
  --restart always \
  -v $(pwd)/database:/database \
  -e EMAIL=${EMAIL} \
  -e PASSWORD=${PASSWORD} \
  -e WEBHOOK_URL=${WEBHOOK_URL} \
  --name grade-notifier \
  ghcr.io/sipacid/grade-notifier:main
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
