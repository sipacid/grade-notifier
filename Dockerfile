FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /App

COPY ./bot/psg ./psg
RUN dotnet restore "./psg/psg.csproj"
RUN dotnet publish "./psg/psg.csproj" -c Release -o out

COPY ./bot/bot ./bot
RUN dotnet restore "./bot/bot.csproj"
RUN dotnet publish "./bot/bot.csproj" -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:7.0
WORKDIR /App
COPY --from=build-env /App/out .
ENTRYPOINT ["dotnet", "bot.dll"]
