var app;

app = angular.module('HIS', [], function ($interpolateProvider) {
        $interpolateProvider.startSymbol('[[');
        $interpolateProvider.endSymbol(']]');
    })
    .controller('PrescriptionController', ['$scope', '$http', 'api', '$filter', '$timeout', '$window',
        function ($scope, $http, api, $filter, $timeout, $window) {
            $scope.drugs = [];
            $scope.dosages = [];
            $scope.frequencies = [];
            $scope.periods = [];

            //things to be submitted
            $scope.prescribedDrugs = [];
            $scope.complaints = "";
            $scope.investigations = "";
            $scope.diagnosis = "";
            $scope.remarks = "";
            $scope.id = null;

            //variables to keep track of selected values
            $scope.drug = null;
            $scope.period = null;
            $scope.frequency = null;
            $scope.dosage = null;

            //to track if submitted
            $scope.submitted = false;

            $scope.baseUrl = "";
            $scope.token = "";

            //for error handling
            $scope.hasDrugError = false;
            $scope.hasError = false;
            $scope.error = "";
            $scope.hasSuccess = false;

            //to measure the timeout of errors
            $scope.drugErrorTimeout = null;
            $scope.errorTimeout = null;


            /**
             * Init function. loads relevant data from the API.
             * It also set the initial values of the drugs
             */
            $scope.init = function () {
                api.getDrugs($scope.baseUrl, $scope.token).then(function (drugs) {
                    $scope.drugs = drugs;
                });

                api.getDosages($scope.baseUrl, $scope.token).then(function (data) {
                    if (data != null) {
                        $scope.dosages = data.dosages;
                        $scope.frequencies = data.frequencies;
                        $scope.periods = data.periods;
                    }
                });
            };


            /**
             * Adds a drug to the prescribed drugs list. At least a drug and an dosage has to be selected.
             */
            $scope.add = function () {
                var d, dose, frequency, period;

                //initially check whether a drug/dosage is selected
                if (!$scope.drug || !$scope.dosage) {
                    $scope.showDrugError("You must select a drug and a dosage to add to the prescription");
                    return;
                }

                //search for the selected drug, frequency, dosage and period.
                if ($scope.drug) {
                    d = $filter('filter')($scope.drugs, {id: $scope.drug}, false);
                }
                if ($scope.dosage) {
                    dose = $filter('filter')($scope.dosages, {id: $scope.dosage}, false);
                }
                if ($scope.frequency) {
                    frequency = $filter('filter')($scope.frequencies, {id: $scope.frequency}, false);
                }
                if ($scope.period) {
                    period = $filter('filter')($scope.periods, {id: $scope.period}, false);
                }

                //check if the selected drug is already added to the list.
                var arr = $filter('filter')($scope.prescribedDrugs, {drug: {id: d[0].id}}, false);
                if (arr.length > 0) {
                    $scope.showDrugError("Drug already added to the prescription");
                    return;
                }

                $scope.hasDrugError = false;
                $scope.prescribedDrugs.push(
                    {
                        drug: d[0],
                        dose: dose[0],
                        frequency: frequency && frequency.length > 0 ? frequency[0] : null,
                        period: period && period.length > 0 ? period[0] : null,
                        type: 1
                    }
                );

                //reset the drugs
                $scope.drug = null;
                $scope.period = null;
                $scope.frequency = null;
                $scope.dosage = null;
            };


            /**
             * Helper method to show an error. An error will be visible for 5 seconds
             * @param message
             */
            $scope.showDrugError = function (message) {
                $scope.error = message;
                $scope.hasDrugError = true;
                $timeout.cancel($scope.drugErrorTimeout);
                $scope.drugErrorTimeout = $timeout(function () {
                    $scope.hasDrugError = false;
                }, 10000);
            };


            /**
             * Remove a prescribed drug from the list
             * @param index
             */
            $scope.removeDrug = function (index) {
                $scope.prescribedDrugs.splice(index, 1);
            };


            /**
             * Saves the prescription in the database.
             * Every prescription requires at least the diagnosis or the complaints to be present.
             * If there are no prescribed drugs available, a confirm will ask to confirm the action.
             */
            $scope.savePrescription = function () {
                $scope.hasSuccess = false;
                if (!$scope.diagnosis && !$scope.complaints) {
                    $scope.showError("At least one of diagnosis and presenting complaints has to be filled");
                    return;
                }
                if ($scope.prescribedDrugs.length == 0 && !$window.confirm("You haven't added any drugs in the prescription. Do you wish to proceed?")) {
                    return;
                }
                $scope.submitted = true;
                var data = {
                    id: $scope.id,
                    complaints: $scope.complaints,
                    investigations: $scope.investigations,
                    diagnosis: $scope.diagnosis,
                    remarks: $scope.remarks,
                    prescribedDrugs: $scope.prescribedDrugs,
                    _token: $scope.token
                };
                //call the api to save prescription and if successful, clear prescription
                api.savePrescription($scope.baseUrl, data).then(function (data) {
                    console.log(data);
                    $scope.submitted = false;
                    if (data && data.status == 1) {
                        $scope.clearPrescription();
                        $scope.hasSuccess = true;
                        $window.scrollTo(0, 0);
                    }
                    else {
                        $scope.showError("Unable to save the prescription. Please try again!");
                    }
                });
            };


            /**
             * Helper method to show an error. An error will be visible for 5 seconds
             * @param message
             */
            $scope.showError = function (message) {
                $scope.error = message;
                $scope.hasError = true;
                $window.scrollTo(0, 0);
                $timeout.cancel($scope.errorTimeout);
                $scope.eTimeout = $timeout(function () {
                    $scope.hasError = false;
                }, 10000);
            };


            /**
             * Clears the prescription by removing all the prescribed drugs.
             */
            $scope.clearPrescription = function () {
                $scope.prescribedDrugs = [];
                $scope.complaints="";
                $scope.investigations="";
                $scope.diagnosis="";
                $scope.remarks="";
            };

        }])
    .service('api', ['$http', function ($http) {
        return {
            /**
             * Get the drugs from the server
             * @param baseUrl
             * @param token
             * @returns {*}
             */
            getDrugs: function (baseUrl, token) {
                return $http.post(baseUrl + "/API/drugs", {
                    _token: token
                }).then(function (response) {
                    return response.data;
                }, function () {
                    return [];
                });
            },

            /**
             * Get the dosages from API
             * @param baseUrl
             * @param token
             * @returns {*}
             */
            getDosages: function (baseUrl, token) {
                return $http.post(baseUrl + "/API/dosages", {
                    _token: token
                }).then(function (response) {
                    return response.data;
                }, function () {
                    return null;
                });
            },


            /**
             * Save a prescription by sending to the server.
             * @param baseUrl
             * @param data
             * @returns {*}
             */
            savePrescription: function (baseUrl, data) {
                return $http.post(baseUrl + "/API/savePrescription", data).then(
                    function (response) {
                        return response.data;
                    }, function (response) {
                        return response.data;
                    }
                );
            }
        };
    }]);

