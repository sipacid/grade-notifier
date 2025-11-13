# grade-notifier

Notifies you when you have a new grade on peoplesoft (Inholland)

## End of Life

There has been an update which requires you to use Microsoft authentication to login, which breaks the method used to retrieve grades.
Project has been archived as of 13-11-2025.

## Table of Contents

- [Usage](#usage)
- [License](#license)

## Usage

To start the project use the following command

```bash
docker run -d \
  --restart always \
  -v $(pwd)/database:/database \
  -e EMAIL="<your_email>" \
  -e PASSWORD="<your_password>" \
  -e WEBHOOK_URL="<your_webhook_url>" \
  --name grade-notifier \
  ghcr.io/sipacid/grade-notifier:main
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
