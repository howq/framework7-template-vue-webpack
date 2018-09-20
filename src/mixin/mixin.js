import co from 'co'
import WPAPI from 'wpapi'
import { driver} from '@rocket.chat/sdk'
import configs from '../configs.js'

//ajax
function* $ajax(url, type, param, async, loading, jsonType, arr, valiToken) {
  let contentType = jsonType ? 'application/json' : 'application/x-www-form-urlencoded; charset=UTF-8';
  let token = local.get('token');
  for (var key in param) {
    if (typeof param[key] === 'string') {
      param[key] = $.trim(param[key].replace(/<\/?[^>]*>/g, ''))
    }
  }
  if (valiToken && !token) {
    this.$message({type: 'error', message: "token过期请重新登录"});
    this.$router.push({name: 'login'})
  } else if (valiToken) {
    param.token = token
  }
  let o = {
    url: url,
    type: type,
    data: param,
    async: async,
    contentType: contentType
  };
  let data = {};
  if (arr) {
    o.traditional = true
  }
  if (loading) {
    this[loading] = true
  }

  data = yield $.ajax(o)
    .then((function (d) {
      if (loading) {
        this[loading] = false
      }
      if (d.state !== 0) {
        if (d.state == 97 || d.state == 98) {
          this.$message({type: 'error', message: d.msg});
          this.$router.push({name: 'login'})
        } else {
          this.$message({type: 'error', message: d.msg});
          // this.$router.push({ name: 'page500' ,query:{error:d.readyState}})
          console.error(d.msg);
          if (typeof d.aaData === 'undefined' || d.aaData === null) {
            d.aaData = []
          }
          return d
        }
      } else if (typeof d.aaData === 'undefined' || d.aaData === null) {
        d.aaData = [];
        return d
      } else {
        return d
      }
    }).bind(this))
    .fail((function (d) {
      if (loading) {
        this[loading] = false
      }
      if (d.readyState === 4 && d.status === 404) {
        this.$router.push({name: 'page404', query: {error: d.readyState}})
      } else if (d.status === 403) {
        this.$router.push({name: 'page403'})
      } else if ((d.status + '').indexOf('50') === 0) {
        this.$router.push({name: 'page500', query: {error: d.readyState}})
      } else {
        this.$message({type: 'error', message: '接口异常'});
      }
    }).bind(this));
  return yield new Promise((function (resolve, reject) {
    resolve(data)
  }).bind(this))
}

export default {
  data() {
    return {
      currWebsite: undefined,
      currWebsiteApi: undefined,
      HOST: 'chat.bymarx.org',
      USER: 'suyi',
      PASS: '90909bu0',
      BOTNAME: 'easybot',
      SSL: true,
      ROOMS: ['testroom'],
    };
  },
  beforeMount() {
    this.initWpApi();
    this.runbot();
  },
  methods: {
    initWpApi() {
      if (undefined == this.currWebsite) {
        this.currWebsite = configs.default_website;
      }
      const _this = this;
      configs.websites.forEach(function (website) {
        for (const name in website) {
          if (name == _this.currWebsite) {
            _this.currWebsiteApi = new WPAPI({endpoint: website[name]});
          }
        }
      });
    },
    runbot: async function (){
      var myuserid;
      const conn = await driver.connect( { host: this.HOST, useSsl: this.SSL})
      myuserid = await driver.login({username: this.USER, password: this.PASS});
      const roomsJoined = await driver.joinRooms(this.ROOMS);
      console.log('joined rooms');
      // set up subscriptions - rooms we are interested in listening to
      const subscribed = await driver.subscribeToMessages();
      console.log('subscribed');

      // connect the processMessages callback
      const msgloop = await driver.reactToMessages( this.processMessages );
      console.log('connected and waiting for messages');

      // when a message is created in one of the ROOMS, we
      // receive it in the processMesssages callback

      // greets from the first room in ROOMS
      const sent = await driver.sendToRoom( this.BOTNAME + ' is listening ...',this.ROOMS[0]);
      console.log('Greeting message sent');
    },
    processMessages: async function (err, message, messageOptions) {
      if (!err) {
        // filter our own message
        if (message.u._id === myuserid) return;
        // can filter further based on message.rid
        const roomname = await driver.getRoomName(message.rid);
        if (message.msg.toLowerCase().startsWith(this.BOTNAME)) {
          const response = message.u.username +
            ', how can ' + this.BOTNAME + ' help you with ' +
            message.msg.substr(this.BOTNAME.length + 1);
          const sentmsg = await driver.sendToRoom(response, roomname);
        }
      }
    },
    _ajax({
            url = this.rootAPI,
            type = 'POST',
            name = '',
            param = {},
            async = true,
            loading = '',
            jsonType = false,
            arr = false,
            valiToken = true
          } = {}) {
      if ((url === this.rootAPI || url === this.userAPI) && name !== '') {
        let api = url + name;
        return co.wrap($ajax).call(this, api, type, param, async, loading, jsonType, arr, valiToken)
      } else {
        return co.wrap($ajax).call(this, url, type, param, async, loading, jsonType, arr, valiToken)
      }
    },
    //获取距离当天的时间
    _getDate(n) {
      const date = moment().subtract(n, 'days').format('YYYY-MM-DD');
      return date
    },
    //获取当前时间
    _getCurrentDate(n) {
      const date = moment().subtract(n, 'days').format('YYYY-MM-DD HH:mm:ss');
      return date
    },
    showMsg(msg, scs) {
      Ext.Msg.show({
        cls: 'jz-msg',
        title: '提示信息',
        message: msg,
        buttons: Ext.Msg.YESNO,
        icon: Ext.Msg.QUESTION,
        minWidth: 500,
        fn: function (btn) {
          if (btn === 'yes') {
            scs()
          }
          if (btn === 'no') {
            console.log('No pressed');
          }
        }
      });
    },
    confirm(msg, scs) {
      return this.$confirm(msg, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(scs).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消'
        });
      });
    },
    _dateFormat({
                  date = '',
                  type = 'YYYY-MM-DD'
                } = {}) {
      if (date) {
        return moment(date).format(type)
      } else {
        return ''
      }

    },
    _parseFloat(val, num) {
      if (typeof val === "string") {
        return parseFloat(parseFloat(val).toFixed(num))
      } else if (typeof val === "number") {
        return parseFloat(val.toFixed(num))
      } else {
        return val
      }
    },
    _priceFormat(val) {
      if (typeof val === 'number') {
        return val.div(100)
      } else {
        return val
      }
    },
    isObject(item) {
      return (item !== null && typeof item === 'object' && !Array.isArray(item));
    },
    isEmptyObject(obj) {
      return obj !== null && Object.keys(obj).length == 0
    },
    _go(name, params) {
      if (params) {
        this.$router.push({name, params})
      } else {
        this.$router.push({name})
      }
    },
    _momentAddDay({
                    days = 1,
                    format = 'YYYY-MM-DD'
                  } = {}) {
      return moment().add(days, 'days').format(format)
    },
    _momentSubDay({
                    days = 1,
                    format = 'YYYY-MM-DD'
                  } = {}) {
      return moment().subtract(days, 'days').format(format)
    },
    _moment({
              format = 'YYYY-MM-DD'
            } = {}) {
      return moment().format(format)
    },
  },
}
