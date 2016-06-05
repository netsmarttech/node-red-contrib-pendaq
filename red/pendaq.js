/**
 * Copyright 2013, 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
	
    var PenDAq = require('pendaq');
    var util = require("util");
	
	function PenDAqDevice(config) {
		var node = this;
        RED.nodes.createNode(node,config);
		
		node._dev = PenDAq.getDevice(config.device);
		node._samplesTarget = config.samples;
		
		if(!node._dev) {
			node.error(RED._("pendaq.error.devicenotfound"));
			return;
		}
		
		node.on("close", function(done) {
			node._dev.close(done);
			node._dev.removeListener('data', onDataValues);
			node._dev.removeListener('data', onDataArray);
			node._dev.removeListener('rawdata', onRawData);
			if (RED.settings.verbose) { node.log(RED._("pendaq.status.close") + config.device); }
		});
		
		node.on("input", function(msg) {
			var msgSamples;
			if(!!msg.payload) {
				//doStart
				
				msgSamples = parseInt(msg.samples);
				if(Number.isNaN(msgSamples) || msgSamples < 0) {
					msgSamples = config.samples;
				}
				node._samplesTarget = msgSamples;
				startDevice();
			} else {
				//doStop
				
				stopDevice();
			}
		});
		
		function startDevice() {
			node._samplesCount = 0;
			node._dev.start();
			if (RED.settings.verbose) { node.log(RED._("pendaq.status.start") + config.device); }
		}
		
		function stopDevice() {
			node._dev.stop()
			if (RED.settings.verbose) { node.log(RED._("pendaq.status.stop") + config.device); }
		}
		
		function checkSend(msg) {
			if(node._samplesTarget == 0) {
				node.send(msg);
				return;
			}
			
			node._samplesCount++;
			if(node._samplesCount >= node._samplesTarget) {
				stopDevice();
			}
			if(node._samplesCount <= node._samplesTarget) {
				node.send(msg);
			}
		}
		
		function onRawData(buffer) {
			checkSend({payload: buffer});
		}
		
		function onDataValues(vals) {
			var msgs = [];
			vals.forEach(function (val) {
				msgs.push({payload: val});
			});
			checkSend(msgs);
		}
		
		function onDataArray(vals) {
			checkSend({payload: vals});
		}
		
		switch(config.mode) {
			case "values":
				node._dev.on("data", onDataValues);
				break;
			case "array":
				node._dev.on("data", onDataArray);
				break;
			case "buffer":
				node._dev.on("rawdata", onRawData);
				break;
			default:
				node.error(RED._("pendaq.error.modeunknown"));
				return;
		}
		
		node._dev.open(function() {
			if (RED.settings.verbose) { node.log(RED._("pendaq.status.open") + config.device); }
			if(config.autostart) {
				startDevice();
			}
		});
		
	}
	RED.nodes.registerType("pendaq",PenDAqDevice);

	RED.httpAdmin.get('/pendaq/list', RED.auth.needsPermission('pendaq.list'), function(req,res) {
        res.json(PenDAq.getAvailableDevices()); //TODO change to serial numbers!
    });
	
	// --------- Oscope-related ----------
	
	RED.httpAdmin.get('/pendaq/scope', RED.auth.needsPermission('pendaq.scope'), function(req,res) {
        res.json({
			info: "TBD!"
		});
    });
	
	RED.httpAdmin.get('/pendaq/scope/:id', RED.auth.needsPermission('pendaq.scope'), function(req,res) {
        res.json({
			id: req.params.id,
			info: "TBD!"
		});
    });
};
