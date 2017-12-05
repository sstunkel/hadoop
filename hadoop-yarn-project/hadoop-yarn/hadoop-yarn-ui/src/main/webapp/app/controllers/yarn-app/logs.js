/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Ember from 'ember';

export default Ember.Controller.extend({
  queryParams: ["service"],
  service: undefined,

  selectedAttemptId: '',
  attemptContainerList: null,
  selectedContainerId: '',
  selectedLogFileName: '',
  containerLogFiles: null,
  selectedLogFileContent: '',

  _isLoadingTopPanel: false,
  _isLoadingBottomPanel: false,

  actions: {
    showContainersForAttemptId(attemptId) {
      this.set('selectedAttemptId', '');
      if (attemptId) {
        this.set('_isLoadingTopPanel', true);
        this.set('selectedAttemptId', attemptId);
        this.fetchContainersForAttemptId(attemptId).then((hash) => {
          let containers = null;
          if (hash.rmContainers.get('length') > 0 && hash.rmContainers.get('content')) {
            containers = (containers || []).concat(hash.rmContainers.get('content'));
          }
          if (hash.tsContainers.get('length') > 0 && hash.tsContainers.get('content')) {
            containers = (containers || []).concat(hash.tsContainers.get('content'));
          }
          this.set('attemptContainerList', containers);
        }).finally(() => {
          this.set('_isLoadingTopPanel', false);
        });
      } else {
        this.set('attemptContainerList', null);
        this.set('selectedContainerId', '');
        this.set('containerLogFiles', null);
        this.set('selectedLogFileName', '');
        this.set('selectedLogFileContent', '');
      }
    },

    showLogFilesForContainerId(containerId) {
      this.set('selectedContainerId', '');
      this.set('containerLogFiles', null);
      this.set('selectedLogFileName', '');
      this.set('selectedLogFileContent', '');
      if (containerId) {
        this.set('_isLoadingBottomPanel', true);
        this.set('selectedContainerId', containerId);
        this.fetchLogFilesForContainerId(containerId).then((hash) => {
          if (hash.logs.get('length') > 0) {
            this.set('containerLogFiles', hash.logs);
          } else {
            this.set('containerLogFiles', null);
          }
        }).finally(() => {
          this.set('_isLoadingBottomPanel', false);
        });
      }
    },

    showContentForLogFile(logFile) {
      this.set('selectedLogFileName', '');
      Ember.$("#logContentTextArea1234554321").val('');
      this.set('showFullLog', false);
      if (logFile) {
        this.set('_isLoadingBottomPanel', true);
        this.set('selectedLogFileName', logFile);
        this.fetchContentForLogFile(this.get('selectedContainerId'), logFile).then((content) => {
          this.set('selectedLogFileContent', content.trim());
        }, () => {
          this.set('selectedLogFileContent', '');
        }).always(() => {
          this.set('_isLoadingBottomPanel', false);
        });
      } else {
        this.set('selectedLogFileContent', '');
      }
    },

    findNextTextInLogContent() {
      let searchInputElem = document.getElementById('logSeachInput98765');
      this.send('searchTextInLogContent', searchInputElem.value);
    },

    searchTextInLogContent(searchText) {
      Ember.$('body').scrollTop(278);
      let textAreaElem = document.getElementById('logContentTextArea1234554321');
      let logContent = textAreaElem.innerText;
      let startIndex = this.searchTextStartIndex || 0;
      if (startIndex === -1) {
        startIndex = this.searchTextStartIndex = 0;
      }
      if (this.prevSearchText !== searchText) {
        startIndex = this.searchTextStartIndex = 0;
      }
      if (searchText && searchText.trim()) {
        searchText = searchText.trim();
        this.prevSearchText = searchText;
        if (startIndex === 0) {
          startIndex = logContent.indexOf(searchText, 0);
        }
        let endIndex = startIndex + searchText.length;
        if (document.createRange && window.getSelection) {
          let range = document.createRange();
          range.selectNodeContents(textAreaElem);
          range.setStart(textAreaElem.childNodes.item(0), startIndex);
          range.setEnd(textAreaElem.childNodes.item(0), endIndex);
          let selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        this.searchTextStartIndex = logContent.indexOf(searchText, endIndex + 1);
      } else {
        this.searchTextStartIndex = 0;
      }
    },

    showFullLogFileContent() {
      this.set('showFullLog', true);
      this.notifyPropertyChange('selectedLogFileContent');
    }
  },

  attemptList: Ember.computed('model.attempts', function() {
    let attempts = this.get('model.attempts');
    let list = null;
    if (attempts && attempts.get('length') && attempts.get('content')) {
      list = [].concat(attempts.get('content'));
    }
    return list;
  }),

  fetchContainersForAttemptId(attemptId) {
    return Ember.RSVP.hash({
      rmContainers: this.store.query('yarn-container', {
        app_attempt_id: attemptId
      }).catch(function() {
        return Ember.A();
      }),
      tsContainers: this.store.query('yarn-timeline-container', {
        app_attempt_id: attemptId
      }).catch(function() {
        return Ember.A();
      })
    });
  },

  fetchLogFilesForContainerId(containerId) {
    return Ember.RSVP.hash({
      logs: this.store.query('yarn-log', {
        containerId: containerId
      }).catch(function() {
        return Ember.A();
      })
    });
  },

  fetchContentForLogFile(containerId, logFile) {
    let logAdapter = this.store.adapterFor('yarn-log');
    return logAdapter.fetchLogFileContent(containerId, logFile);
  },

  resetAfterRefresh() {
    this.set('selectedAttemptId', '');
    this.set('attemptContainerList', null);
    this.set('selectedContainerId', '');
    this.set('selectedLogFileName', '');
    this.set('containerLogFiles', null);
    this.set('selectedLogFileContent', '');
  },

  showFullLog: false,

  showLastFewLinesOfLogContent: Ember.computed('selectedLogFileContent', function() {
    let content = this.get('selectedLogFileContent');
    let lines = content.split('\n');
    if (this.get('showFullLog') || lines.length < 10) {
      return content;
    }
    return lines.slice(lines.length - 10).join('\n');
  })

});
