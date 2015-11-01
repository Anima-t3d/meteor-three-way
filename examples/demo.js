/* global Fake: true */
/* global DataCollection: true */
/* global ThreeWay: true */

/* global parentTemplate: true */
/* global childTemplate: true */
/* global grandchildTemplate: true */

var selectedDebugMessages = [
	// 'bindings',
	'data-mirror',
	// 'observer',
	// 'tracker',
	// 'new-id',
	// 'db',
	// 'methods',
	// 'value',
	// 'checked',
	// 'html',
	// 'visible-and-disabled',
	// 'style',
	// 'attr',
	// 'class',
	// 'event',
	'vm-only',
	// 'validation',
	// 're-bind',
];

//selectedDebugMessages = ThreeWay.DEBUG_MESSAGES; // copy
if (Meteor.isClient) {
	ThreeWay.setDebugModeOn();
	ThreeWay.debugModeSelectNone();
	selectedDebugMessages.forEach(x => ThreeWay.debugModeSelect(x));
}


function setUpDebugMessages(template) {
	var selectedDebugMessages = template._3w_get_NR('debugMessages');
	console.info('Selected Debug Messages:', selectedDebugMessages);
	ThreeWay.setDebugModeOn();
	ThreeWay.debugModeSelectNone();
	selectedDebugMessages.forEach(x => ThreeWay.debugModeSelect(x));
}

var fields = [
	'name',
	'emailPrefs',
	'personal.particulars.age',
	'notes',
	'tags',
	'personal.someArr.*',
	'personal.otherArr.*.*'
];


DataCollection = new Mongo.Collection('data');
var allTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
var ageRangeValues = ['0_12', '13_20', '21_35', '36_65', '66_plus'];
var ageRanges = _.object(ageRangeValues, ['0 to 12', '13 to 20', '21 to 35', '36 to 65', '66 and over']);
var emailPrefsValues = ['opt1', 'opt2', 'opt3'];
var emailPrefsAll = _.object(emailPrefsValues, ['Spam Away', 'Only My Orders', 'XYZ']);

if (Meteor.isServer) {
	// The publication
	Meteor.publish('demo-pub', function() {
		return DataCollection.find({});
	});

	fields.forEach(function(field) {
		if (field.indexOf('*') === -1) {
			var methods = {};
			var fn = function(id, value) {
				var updater = {};
				updater[field] = value;
				var myFieldName = 'update-' + field;
				while (myFieldName.length < 40) {
					myFieldName += " ";
				}
				console.log(myFieldName, id, '\t', value);
				DataCollection.update(id, {
					$set: updater
				});
			};
			methods['update-' + field] = fn;
			Meteor.methods(methods);
		}
	});
	Meteor.methods({
		'update-personal.someArr.1': function(id, value) {
			var updater = {};
			updater['personal.someArr.1'] = value;
			var myFieldName = '[specific] update-personal.someArr.1';
			while (myFieldName.length < 40) {
				myFieldName += " ";
			}
			console.log(myFieldName, id, '\t', value);
			DataCollection.update(id, {
				$set: updater
			});
		},
		'update-personal.someArr.*': function(id, value, k) {
			var updater = {};
			updater['personal.someArr.' + k] = value;
			var myFieldName = 'update-personal.someArr.' + k;
			while (myFieldName.length < 40) {
				myFieldName += " ";
			}
			console.log(myFieldName, id, '\t', value);
			DataCollection.update(id, {
				$set: updater
			});
		},
		'update-personal.otherArr.*.*': function(id, value, k, fld) {
			var updater = {};
			updater['personal.otherArr.' + k + '.' + fld] = value;
			var myFieldName = 'update-personal.otherArr.' + k + '.' + fld;
			while (myFieldName.length < 40) {
				myFieldName += " ";
			}
			console.log(myFieldName, id, '\t', value);
			DataCollection.update(id, {
				$set: updater
			});
		}
	});

	// Init. data
	Meteor.methods({
		'regenerate-data': function() {
			DataCollection.remove({});
			_.range(10).forEach(function() {
				var user = Fake.user();
				var tags = [];
				allTags.forEach(function(tag) {
					if (Math.random() < 0.4) {
						tags.push(tag);
					}
				});
				var _emPrefs = [];
				emailPrefsValues.forEach(function(x) {
					if (Math.random() < 0.6) {
						_emPrefs.push(x);
					}
				});
				DataCollection.insert({
					name: user.fullname,
					emailPrefs: _emPrefs,
					personal: {
						particulars: {
							age: Fake.fromArray(ageRangeValues),
						},
						someArr: ["" + Math.floor(Math.random() * 10), '!!!', "" + Math.floor(Math.random() * 10)],
						otherArr: [{
							a: "" + Math.floor(10 + Math.random() * 10),
							b: "" + Math.floor(20 + Math.random() * 10)
						}, {
							a: "" + Math.floor(30 + Math.random() * 10),
							b: "" + Math.floor(40 + Math.random() * 10)
						}, ]
					},
					notes: Fake.sentence(5),
					tags: tags,
				});
			});
		}
	});

	Meteor.call('regenerate-data');
}

var updatersForServer = _.object(fields, fields.map(x => "update-" + x));
updatersForServer['personal.someArr.1'] = 'update-personal.someArr.1';

if (Meteor.isClient) {
	setTimeout(function() {
		if (Math.random() < 0.01) {
			console.info("**************************************************");
			console.info("* Regenerating Data");
			console.info("**************************************************");
			Meteor.call('regenerate-data');
		}
	}, 60000);

	Meteor.subscribe('demo-pub');

	ThreeWay.prepare(Template.DemoThreeWay, {
		// The relevant Mongo.Collection
		collection: DataCollection,

		// Meteor methods for updating the database
		// The keys being the respective fields/field selectors for the database
		// The method signature for these methods being
		// function(_id, value, ...wildCardParams)
		updatersForServer: updatersForServer,

		// Transformations from the server to the view model
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformToServer: {
			// tags: x => (x.trim().length > 0) ? x.split(',').map(y => y.trim()) : [];
			tags: function(x, vmData) {
				var outcome;
				if (!x || (x.trim() === '')) {
					outcome = [];
				} else {
					outcome = x.split(',').map(y => y.trim());
				}
				console.log('dataTransformToServer[\'tags\']:', x, vmData, '-->', outcome);
				return outcome;
			}
		},

		// Transformations from the view model to the server
		// (Transform and call the updater Meteor method)
		// In this example, "tags" are stored in the view model as a comma
		// separated list in a string, while it is stored in the server as
		// an array
		dataTransformFromServer: {
			// tags: arr => arr.join && arr.join(',') || ""
			tags: function(arr, doc) {
				var outcome = arr.join && arr.join(',') || "";
				console.log('dataTransformFromServer[\'tags\']:', arr, doc, '-->', outcome);
				return outcome;
			}
		},

		// Validators under validatorsVM consider view-model data
		// Useful for making sure that transformations to server values do not fail
		// Arguments: (value, vmData, wildCardParams)
		validatorsVM: {
			'personal.someArr.*': function(value, vmData, wildCardParams) {
				var result;
				if (Number(wildCardParams[0]) === 2) {
					// No exclamation marks
					result = value.indexOf('!') === -1;
					if (!result) {
						console.warn('[validatorsVM] personal.someArr.2 should have no \"!\"s', value, wildCardParams);
					}
				} else {
					result = !Number.isNaN(Number(value));
					if (!result) {
						console.warn('[validatorsVM] personal.someArr.* (less 2) should be a number', value, wildCardParams);
					}
				}
				return result;
			},
		},

		// Validators under validatorsServer consider transformed values
		// (no additional view-model data, work with that somewhere else)
		// Arguments: (value, wildCardParams)
		validatorsServer: {
			tags: function(value) {
				return value.filter(x => x.substr(0, 3).toLowerCase() !== 'tag').length === 0;
			},
			'personal.someArr.*': function(value, wildCardParams) {
				var result;
				if (Number(wildCardParams[0]) === 2) {
					// no '@'s
					result = value.indexOf('@') === -1;
					if (!result) {
						console.warn('[validatorsServer] personal.someArr.2 should have no \"@\"s', value, wildCardParams);
					}
				} else {
					result = !Number.isNaN(Number(value));
					if (!result) {
						console.warn('[validatorsServer] personal.someArr.* (less 2) should be a number', value, wildCardParams);
					}
				}
				return result;
			},
		},

		// Success callbacks for validators
		validateSuccessCallback: {
			'tags': function(template, value, vmData, field, params) {
				console.info('[Validated!] tags:', value, field, params);
				template._3w_set('tagsValidationErrorText', '');
			},
			'personal.someArr.*': function(template, value, vmData, field, params) {
				console.info('[Validated!] personal.someArr.*', value, field, params);
				template._3w_set('someArrValidationErrorText.' + params[0], '');
			},
		},

		// Failure callbacks for validators
		validateFailureCallback: {
			'tags': function(template, value, vmData, field, params) {
				console.warn('[Validation Failed] tags:', value, field, params);
				template._3w_set('tagsValidationErrorText', 'Each tag should begin with \"tag\".');
			},
			'personal.someArr.*': function(template, value, vmData, field, params) {
				console.warn('[Validation Failed] personal.someArr.*', value, field, params);
				template._3w_set('someArrValidationErrorText.' + params[0], 'error');
			},
		},

		// Pre-processors for data pre-render (view model to view)
		preProcessors: {
			// this takes a string of comma separated tags, splits, trims then
			// joins them to make the result "more presentable"
			tagsTextDisplay: x => (!x) ? "" : x.split(',').map(x => x.trim()).join(', '),
			// this maps a key to the corresponding long form description
			mapToAgeDisplay: x => ageRanges[x],
			// this maps an array of keys to the corresponding long form
			// descriptions and then joins them
			mapToEmailPrefs: function(prefs, elem, vmData) {
				var outcome = prefs.map(x => emailPrefsAll[x]).join(", ");
				console.log('preProcessors[\'mapToEmailPrefs\']\nValue: ', prefs, "\nDOM Element:", elem, "\nView Model Data:", vmData, '-->', outcome);
				return outcome;
			},
			boldIfMoreThanOne: function(prefString) {
				return (prefString.split(',').length <= 1) ? prefString : '<strong>' + prefString + '</strong>';
			},
			sayHideToHide: function(v) {
				return v.trim().toUpperCase() !== "HIDE";
			},
			toUpperCase: function(v) {
				return v.toUpperCase();
			},
			appendTimeStamp: function(v) {
				return v + ' (' + (new Date()) + ')';
			},
			not: x => !x,
			noIsFalse: (x) => x.trim().toLowerCase() === 'no' ? false : true,
			trueIfNonEmpty: x => x.length > 0,
			grayIfTrue: x => (!!x) ? "#ccc" : "",
			redIfTrue: x => (!!x) ? "red" : "",
			// This is something "special" to make the Semantic UI Dropdown work
			// (There's some DOM manipulation in the method)
			// More helpers will be written soon...
			updateSemanticUIDropdown: ThreeWay.processors.updateSemanticUIDropdown
		},

		// (Global) initial values for fields that feature only in the local view
		// model and are not used to update the database
		// Will be overridden by value tags in the rendered template of the form:
		// <data field="additional" initial-value="view model to view only"></data>
		viewModelToViewOnly: {
			"hide": "Set to \"hide\" to hide",
			"debugMessages": selectedDebugMessages,
			"tagsValidationErrorText": "",
			"someArrValidationErrorText.0": "",
			"someArrValidationErrorText.2": "",
		},

		// Event Handlers for binding
		// Event Handlers bound like
		// <input data-bind="value: sliderValue; event: {mousedown: dragStartHandler, mouseup: dragEndHandler|saySomethingHappy}" type="range">
		eventHandlers: {
			dragStartHandler: function(event, template, vmData) {
				console.info("Drag Start at " + (new Date()), event, template, vmData);
			},
			dragEndHandler: function(event, template, vmData) {
				console.info("Drag End at " + (new Date()), event, template, vmData);
			},
			saySomethingHappy: function() {
				console.info("Let\'s chill. (Second mouseup event to fire.)");
			},
		},

		// Database Update Parameters
		// "Debounce Interval" for Meteor calls; See: http://underscorejs.org/#debounce
		debounceInterval: 300, // default: 500
		// "Throttle Interval" for Meteor calls; See: http://underscorejs.org/#throttle ; fields used for below...
		throttleInterval: 500, // default: 500
		// Fields for which updaters are throttle'd instead of debounce'ed
		throttledUpdaters: ['emailPrefs', 'personal.particulars.age'],
		// Interval between update Meteor methods on fields with the same top level parent (e.g.: `particulars.name` and `particulars.hobbies.4.hobbyId`).
		methodInterval: 50,

		// "Re-Bind Poll Interval" for discovering new DOM nodes in need of data-binding
		rebindPollInterval: 500, // default: 500
	});

	Template.DemoThreeWay.onCreated(function() {
		parentTemplate = this;

		this.id = new ReactiveVar(null);
		this.num = new ReactiveVar(1);
	});

	Template.DemoThreeWay.onRendered(function() {
		(function createDropdown() {
			if (!selectCreated) {
				var selector = $('.ui.dropdown');
				if (selector.length > 0) {
					selectCreated = true;
					selector.dropdown({
						allowAdditions: true
					});
				} else {
					setTimeout(createDropdown, 10);
				}
			}
		})();

		setUpDebugMessages(Template.instance());
	});

	Template.DemoThreeWay.helpers({
		data: () => DataCollection.find(),
		allTags: () => allTags.map(x => x),
		ageRanges: () => _.extend({}, ageRanges),
		emailPrefsAll: () => _.extend({}, emailPrefsAll),
		emailPrefsToCSL: function(arr) {
			return arr.map(x => emailPrefsAll[x]).join(", ");
		},
		selectId: () => Template.instance().id.get(),
		entry: () => DataCollection.findOne(Template.instance().id.get(), {
			reactive: true
		}),
		num: () => Template.instance().num.get(),
		allDebugMessages: () => ThreeWay.DEBUG_MESSAGES,
	});

	var selectCreated = false;
	Template.DemoThreeWay.events({
		"click button.select-data": function(event, template) {
			template.num.set(1);
			var id = event.target.getAttribute('id').split('-')[1];
			console.info('Setting ID to: ' + id);
			console.info('Note the personal.someArr array is initially only bound to one input element (item 0).');

			// Set time out to allow the effects of setting num to 1 to set in
			// so the additional elements are only rendered later
			setTimeout(function() {
				template._3w_setId(id);

				setTimeout(function() {
					$('html, body').animate({
						scrollTop: Math.max(0, $("#edit-head").offset().top - 120)
					}, 500);
				}, 50);

				setTimeout(function() {
					template.num.set(3);
					console.info('Now (~3 sec later) personal.someArr array bound to three input elements (item 0, 1 & 2).');
				}, 3000);
			}, 50);
		},
		"click button.talk": function() {
			/* global alert: true */
			alert('Not disabled!');
		},
		"change input[name=debug-messages]": function(event, template) {
			setTimeout(() => setUpDebugMessages(template), 50);
		}
	});


	ThreeWay.prepare(Template.DemoThreeWayChild, {
		// The relevant fields/field selectors in the database
		fields: [],
		// The relevant Mongo.Collection
		collection: DataCollection,
		// Meteor methods for updating the database
		viewModelToViewOnly: {
			"childData": "1234"
		},
	});
	Template.DemoThreeWayChild.onCreated(function() {
		childTemplate = this;
	});


	ThreeWay.prepare(Template.DemoThreeWayGrandChild, {
		// The relevant fields/field selectors in the database
		fields: [],
		// The relevant Mongo.Collection
		collection: DataCollection,
		// Meteor methods for updating the database
	});
	Template.DemoThreeWayGrandChild.onCreated(function() {
		grandchildTemplate = this;
	});

}