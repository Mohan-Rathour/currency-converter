User methods
1. Convert currency
  - in: amount, currency code, new currency code
  - out: new amount, new currency code, new currency symbol

2. Give conversion rate
  - in: currency code from, currency code to
  - out: conversion rate


*Specs
  - Save data to file
    - format: USD=$ 1.00
  - When doing any data lookup, get live data or fallback to file
  - Always update file after getting new data

Configuration
  - File storage
  - Remote API access



METHOD OUTLINE
1. Convert currency
  get conversion rate for FROM currency (data from file or service)
  get conversion rate for TO currency (data from file or service)
  calculate new amount based on from and to conversion rates
  get TO currency symbol (data from file or service)
  return object with new amount, TO currency code, TO currency symbol

2. Give conversion rate
  get FROM conversion rate (data from file or service)
  get TO conversion rate (data from file or service)
  calculate rate to convert TO to FROM
  return rate


SERVICES
  - Returns conversion rate and currency symbol for a country code
  - *NOTE: use fastest method of data that is as up-to-date as possible
      - Remote data is refreshed ever hour
      - Performance order: memory, file, http
