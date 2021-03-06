#       __  __     _______ ______
#     / / / /__  / __/ _ /_  __/__
#   / /_/ / _ \/ _// __ |/ / / _ \
#  \____/_//_/___/_/ |_/_/ /_//_/
#
#  Author: Willi Menapace <willi.menapace@gmail.com>
#

from db.canteen_entity import CanteenEntity
from db.measure_entity import MeasureEntity
from db.prevision_data_entity import PrevisionDataEntity

import utils.timeutils as timeutils

import datetime

import numpy as np
import sklearn
from sklearn.neural_network import MLPRegressor

#Predictor for queue waiting times
class QueuePredictor:

    # Creates a new QueuePredictor
    #
    # @param openingHours touple of the form (openTime, closeTime)
    # @param measureEntityList data on which to base the prediction. Must not be empty
    def __init__(self, openingHours, measureEntityList):

        #Minimum number of training iterations. Guards against bad initial training points which cause training to end prematurely
        self._minIterations = 250
        self._maxRetries = 100

        #Creates data arrays
        measuresCount = len(measureEntityList)

        if measuresCount == 0:
            raise ValueError("Cannot initialize predictor with empty measure list")

        self._arriveTimes = np.empty([measuresCount, 1])
        self._waitTimes = np.empty(measuresCount)

        #The opening hours
        self._openingHours = openingHours

        #The maximum arrive time
        self._maxArriveTime = 1
        self._maxWaitSeconds = 0
        measureCounter = 0
        for currentMeasure in measureEntityList:
            #Calcolates seconds elapsed from canteen opening
            currentArriveTime = currentMeasure.arriveDateTime.time()

            self._arriveTimes[measureCounter] = timeutils.timeDifference(currentArriveTime, openingHours[0])
            self._waitTimes[measureCounter] = currentMeasure.waitSeconds

            if self._maxWaitSeconds < currentMeasure.waitSeconds:
                self._maxWaitSeconds = currentMeasure.waitSeconds

            measureCounter += 1

        #The maximum arrive time
        self._maxArriveTime = np.max(self._arriveTimes)

        #Normalize the data
        self._arriveTimes /= self._maxArriveTime
        self._waitTimes /= self._maxWaitSeconds

    # Returns the predictions generated by the model
    #
    # @param predictionsInterval interval in seconds between each predictions
    # @returns list of PrevisionDataEntity without prevision ids and prevision data ids specified
    def getPredictions(self, predictionsInterval):
        regressor = MLPRegressor(activation='logistic', hidden_layer_sizes=(20), solver="lbfgs", max_iter=100000)

        #Seconds to simulate
        modelDuration = timeutils.timeDifference(self._openingHours[1], self._openingHours[0])


        regressor.fit(self._arriveTimes, self._waitTimes)

        retriesCount = 0
        bestRegressor = regressor

        #Guards against premature training failure
        while regressor.n_iter_ < self._minIterations and retriesCount < self._maxRetries:
            regressor.fit(self._arriveTimes, self._waitTimes)
            retriesCount += 1
            if regressor.n_iter_ > bestRegressor.n_iter_:
                bestRegressor = regressor

        regressor = bestRegressor
        if retriesCount == self._maxRetries:
            print("Warning: training failure of queue predictor model")

        predictedValues = []

        currentX = 0
        #Generates predictions
        while currentX <= modelDuration:
            #Data is normalized so probe points must be denormalized
            currentY = regressor.predict(currentX / self._maxArriveTime)[0] * self._maxWaitSeconds

            #Avoids negative waiting times
            if currentY < 0:
                currentY = 0

            predictedValues += [PrevisionDataEntity(None, None, (datetime.datetime.combine(datetime.datetime.today(), self._openingHours[0]) + datetime.timedelta(seconds = currentX)).time(), currentY)]

            currentX += predictionsInterval

        return predictedValues
