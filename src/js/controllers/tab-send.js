'use strict'
/* global angular */
angular.module('canoeApp.controllers').controller('tabSendController', function ($scope, $rootScope, $log, $timeout, $ionicScrollDelegate, addressbookService, profileService, lodash, $state, walletService, incomingData, popupService, platformInfo, gettextCatalog, scannerService, externalLinkService) {
  var originalList
  var CONTACTS_SHOW_LIMIT
  var currentContactsPage
  $scope.isChromeApp = platformInfo.isChromeApp
  $scope.serverMessage = null

  var updateAccountsList = function () {
    $scope.showTransferCard = $scope.hasMoreAccounts
    $scope.hasFunds = profileService.hasFunds()
    if ($scope.showTransferCard) {
      var accountList = []
      lodash.each($scope.accounts, function (acc) {
        accountList.push({
          meta: acc.meta,
          color: acc.meta.color,
          name: acc.name,
          alias: lodash.isObject(v) ? v.alias : null,
          avatar: lodash.isObject(v) ? v.avatar : null,
          recipientType: 'account',
          address: acc.id
        })
      })
      originalList = originalList.concat(accountList)
    }
  }

  var updateContactsList = function (cb) {
    addressbookService.list(function (err, ab) {
      if (err) $log.error(err)

      $scope.hasContacts = !lodash.isEmpty(ab)
      if (!$scope.hasContacts) return cb()

      var completeContacts = []
      lodash.each(ab, function (v, k) {
        completeContacts.push({
          name: lodash.isObject(v) ? v.name : v,
          address: k,
          email: lodash.isObject(v) ? v.email : null,
          alias: lodash.isObject(v) ? v.alias : null,
          avatar: lodash.isObject(v) ? v.avatar : null,
          recipientType: 'contact',
          getAddress: function (cb) {
            return cb(null, k)
          }
        })
      })
      var contacts = completeContacts.slice(0, (currentContactsPage + 1) * CONTACTS_SHOW_LIMIT)
      $scope.contactsShowMore = completeContacts.length > contacts.length
      originalList = originalList.concat(contacts)
      return cb()
    })
  }

  var updateList = function () {
    $scope.list = lodash.clone(originalList)
    $timeout(function () {
      $ionicScrollDelegate.resize()
      $scope.$apply()
    }, 10)
  }

  $scope.openScanner = function () {
    var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP

    if (!isWindowsPhoneApp) {
      $state.go('tabs.scan')
      return
    }

    scannerService.useOldScanner(function (err, contents) {
      if (err) {
        popupService.showAlert(gettextCatalog.getString('Error'), err)
        return
      }
      incomingData.redir(contents)
    })
  }

  $scope.showMore = function () {
    currentContactsPage++
    updateAccountsList()
  }

  $scope.searchInFocus = function () {
    $scope.searchFocus = true
  }

  $scope.searchBlurred = function () {
    if ($scope.formData.search === null || $scope.formData.search.length === 0) {
      $scope.searchFocus = false
    }
  }

  $scope.findContact = function (search) {
    // If redir returns true it matched something and
    // will already have moved us to amount.
    incomingData.redir(search, function (err, code) {
      if (err) {
        // Ok, redir did not match anything, then we search
        if (!search || search.length < 2) {
          $scope.list = originalList
          $timeout(function () {
            $scope.$apply()
          })
          return
        }
        var sea = search.toLowerCase()
        var result = lodash.filter(originalList, function (item) {
          return (
            // If name has substring, or address startsWith, or email startsWith
            // or alias startsWith
            lodash.includes(item.name.toLowerCase(), sea) ||
            (item.address && item.address.toLowerCase().startsWith(sea)) ||
            (item.alias && item.alias.alias.toLowerCase().startsWith(sea)) ||
            (item.email && item.email.toLowerCase().startsWith(sea))
          )
        })
        $scope.list = result
      }
    })
  }

  $scope.goToAmount = function (item) {
    $timeout(function () {
      return $state.transitionTo('tabs.send.amount', {
        recipientType: item.recipientType,
        toAddress: item.address,
        toName: item.name,
        toEmail: item.email,
        toColor: item.color,
        toAlias: item.alias
      })
    })
  }

  $scope.openServerMessageLink = function () {
    var url = $scope.serverMessage.link
    externalLinkService.open(url)
  }

  // This could probably be enhanced refactoring the routes abstract states
  $scope.createAccount = function () {
    $state.go('tabs.home').then(function () {
      $state.go('tabs.create-account')
    })
  }

  $scope.buyBitcoin = function () {
    $state.go('tabs.home').then(function () {
      $state.go('tabs.buyandsell')
    })
  }

  $scope.$on('$ionicView.beforeEnter', function (event, data) {
    $scope.accounts = profileService.getAccounts()
    $scope.hasAccounts = !lodash.isEmpty($scope.accounts)
    $scope.hasMoreAccounts = $scope.accounts.length > 1

    $scope.checkingBalance = true
    $scope.formData = {
      search: null
    }
    originalList = []
    CONTACTS_SHOW_LIMIT = 10
    currentContactsPage = 0
  })

  $scope.$on('$ionicView.enter', function (event, data) {
    if (!$scope.hasAccounts) {
      $scope.checkingBalance = false
      return
    }
    updateAccountsList()
    updateContactsList(function () {
      updateList()
    })
  })
})
