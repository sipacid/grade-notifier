FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /App

# Copy everything
COPY ./bot/psg ./psg
# Restore as distinct layers
RUN dotnet restore "./psg/psg.csproj"
# Build and publish a release
RUN dotnet publish "./psg/psg.csproj" -c Release -o out

# Copy everything
COPY ./bot/bot ./bot
# Restore as distinct layers
RUN dotnet restore "./bot/bot.csproj"
# Build and publish a release
RUN dotnet publish "./bot/bot.csproj" -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0
WORKDIR /App
COPY --from=build-env /App/out .
ENTRYPOINT ["dotnet", "bot.dll"]