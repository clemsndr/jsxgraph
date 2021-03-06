/*
    Copyright 2008-2013
        Matthias Ehmann,
        Michael Gerhaeuser,
        Carsten Miller,
        Bianca Valentin,
        Alfred Wassermann,
        Peter Wilfahrt

    This file is part of JSXGraph.

    JSXGraph is free software dual licensed under the GNU LGPL or MIT License.
    
    You can redistribute it and/or modify it under the terms of the
    
      * GNU Lesser General Public License as published by
        the Free Software Foundation, either version 3 of the License, or
        (at your option) any later version
      OR
      * MIT License: https://github.com/jsxgraph/jsxgraph/blob/master/LICENSE.MIT
    
    JSXGraph is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.
    
    You should have received a copy of the GNU Lesser General Public License and
    the MIT License along with JSXGraph. If not, see <http://www.gnu.org/licenses/>
    and <http://opensource.org/licenses/MIT/>.
 */


/*global JXG: true, define: true, jQuery: true, window: true, document: true, navigator: true, require: true, module: true, console: true */
/*jslint nomen:true, plusplus:true, forin:true*/

/* depends:
 */

/**
 * @fileoverview The JSXGraph object is defined in this file. JXG.JSXGraph controls all boards.
 * It has methods to create, save, load and free boards. Additionally some helper functions are
 * defined in this file directly in the JXG namespace.
 * @version 0.83
 */

define([], function () {

    "use strict";

    var jxg = {};

    if (typeof JXG === 'object') {
        jxg = JXG;
    }

    // We need the following two methods "extend" and "shortcut" to create the JXG object via JXG.extend.

    /**
     * Copy all properties of the <tt>extension</tt> object to <tt>object</tt>.
     * @param {Object} object
     * @param {Object} extension
     * @param {Boolean} [onlyOwn=false] Only consider properties that belong to extension itself, not any inherited properties.
     * @param {Boolean} [toLower=false] If true the keys are convert to lower case. This is needed for visProp, see JXG#copyAttributes
     */
    jxg.extend = function (object, extension, onlyOwn, toLower) {
        var e, e2;

        onlyOwn = onlyOwn || false;
        toLower = toLower || false;

        // the purpose of this for...in loop is indeed to use hasOwnProperty only if the caller
        // explicitly wishes so.
        for (e in extension) {
            if (!onlyOwn || (onlyOwn && extension.hasOwnProperty(e))) {
                if (toLower) {
                    e2 = e.toLowerCase();
                } else {
                    e2 = e;
                }

                object[e2] = extension[e];
            }
        }
    };

    jxg.extend(jxg, /** @lends JXG */ {
        /**
         * Store a reference to every board in this central list. This will at some point
         * replace JXG.JSXGraph.boards.
         * @type Object
         */
        boards: {},

        /**
         * Store the available file readers in this structure.
         * @type Object
         */
        readers: {},

        /**
         * Associative array that keeps track of all constructable elements registered
         * via {@link JXG.JSXGraph.registerElement}.
         * @type Object
         */
        elements: {},

        /**
         * This registers a new construction element to JSXGraph for the construction via the {@link JXG.Board.create}
         * interface.
         * @param {String} element The elements name. This is case-insensitive, existing elements with the same name
         * will be overwritten.
         * @param {Function} creator A reference to a function taking three parameters: First the board, the element is
         * to be created on, a parent element array, and an attributes object. See {@link JXG.createPoint} or any other
         * <tt>JXG.create...</tt> function for an example.
         */
        registerElement: function (element, creator) {
            element = element.toLowerCase();
            this.elements[element] = creator;
        },

        /**
         * Register a file reader.
         * @param {function} reader A file reader. This object has to provide two methods: <tt>prepareString()</tt>
         * and <tt>read()</tt>.
         * @param {Array} ext
         */
        registerReader: function (reader, ext) {
            var i, e;

            for (i = 0; i < ext.length; i++) {
                e = ext[i].toLowerCase();

                if (typeof this.readers[e] !== 'function') {
                    this.readers[e] = reader;
                }
            }
        },

        /**
         * Creates a shortcut to a method, e.g. {@link JXG.Board#createElement} is a shortcut to {@link JXG.Board#create}.
         * Sometimes the target is undefined by the time you want to define the shortcut so we need this little helper.
         * @param {Object} object The object the method we want to create a shortcut for belongs to.
         * @param {String} fun The method we want to create a shortcut for.
         * @returns {Function} A function that calls the given method.
         */
        shortcut: function (object, fun) {
            return function () {
                return object[fun].apply(this, arguments);
            };
        },

        /**
         * s may be a string containing the name or id of an element or even a reference
         * to the element itself. This function returns a reference to the element. Search order: id, name.
         * @param {JXG.Board} board Reference to the board the element belongs to.
         * @param {String} s String or reference to a JSXGraph element.
         * @returns {Object} Reference to the object given in parameter object
         * @deprecated Use {@link JXG.Board#select}
         */
        getRef: function (board, s) {
            return board.select(s);
        },

        /**
         * This is just a shortcut to {@link JXG.getRef}.
         * @deprecated Use {@link JXG.Board#select}.
         */
        getReference: function (board, s) {
            return board.select(s);
        },

        /**
         * Add something to the debug log. If available a JavaScript debug console is used. Otherwise
         * we're looking for a HTML div with id "debug". If this doesn't exist, too, the output is omitted.
         * @param s An arbitrary number of parameters.
         * @see JXG#debugWST
         */
        debugInt: function (s) {
            var i, p;

            for (i = 0; i < arguments.length; i++) {
                p = arguments[i];
                if (window.console && console.log) {
                    console.log(p);
                } else if (document.getElementById('debug')) {
                    document.getElementById('debug').innerHTML += p + "<br/>";
                }
            }
        },

        /**
         * Add something to the debug log. If available a JavaScript debug console is used. Otherwise
         * we're looking for a HTML div with id "debug". If this doesn't exist, too, the output is omitted.
         * This method adds a stack trace (if available).
         * @param s An arbitrary number of parameters.
         * @see JXG#debug
         */
        debugWST: function (s) {
            var e = new Error();

            jxg.debugInt.apply(this, arguments);

            if (e && e.stack) {
                jxg.debugInt('stacktrace');
                jxg.debugInt(e.stack.split('\n').slice(1).join('\n'));
            }
        },

        debugLine: function (s) {
            var e = new Error();

            jxg.debugInt.apply(this, arguments);

            if (e && e.stack) {
                jxg.debugInt('Called from', e.stack.split('\n').slice(2, 3).join('\n'));
            }
        },

        /**
         * Add something to the debug log. If available a JavaScript debug console is used. Otherwise
         * we're looking for a HTML div with id "debug". If this doesn't exist, too, the output is omitted.
         * @param s An arbitrary number of parameters.
         * @see JXG#debugWST
         * @see JXG#debugLine
         * @see JXG#debugInt
         */
        debug: function (s) {
            jxg.debugInt.apply(this, arguments);
        }
    });

    return jxg;
});
