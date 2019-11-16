import React, { Component } from 'react';
import { HashRouter, Route, Link, Switch } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { List, Form, Input, Button, message, DatePicker, TimePicker, Modal, Layout, Radio, Divider, PageHeader, InputNumber, ConfigProvider, Row, Col } from 'antd';
import enUS from 'antd/es/locale/en_US';
import zhCN from 'antd/es/locale/zh_CN';
import axios from 'axios';
import moment, { locales } from 'moment';
import 'moment/locale/zh-cn';
import './App.css';

import { updateCallables, setLocale, changeModuleStatus } from './reducers'


const { Header, Content, Footer } = Layout;


class Callables extends Component {

  componentDidMount() {
    const { setCallables } = this.props

    axios.get('callable')
      .then(response => {
        setCallables(response.data)
      });

  }

  render() {
    return (
      <List
        itemLayout="horizontal"
        dataSource={this.props.callables}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              title={<Link to={`/callable/${item.callable_name}`}>{item.callable_name}</Link>}
              description={item.title}
            />
          </List.Item>
        )}
      />
    );
  }
}

const mapStateToProps = state => {
  return {
    callables: state.callables
  }
}

const mapDispatchToProps = dispatch => {
  return bindActionCreators({
    setCallables: updateCallables
  }, dispatch)
}

const ReduxCallables = connect(mapStateToProps, mapDispatchToProps)(Callables)

class CallableForm extends React.Component {

  constructor(props) {
    super(props)
    const { callables } = this.props

    this.state = {
      visible: false,
      response: null,
      callables: callables,
    };
  }

  componentDidMount() {
    const { setCallables } = this.props

    axios.get('callable')
      .then(response => {
        setCallables(response.data)
      });

  }

  handleSubmit = e => {
    e.preventDefault();
    this.props.form.validateFields((err, values) => {
      if (!err) {
        axios.post(`callable/${this.props.match.params.name}`, values)
          .then((response) => {
            if (response.data.status === 'success') {
              this.showSuccessModal(response.data.result)
            } else {
              this.showErrorModal(response.data.result)
            }
          });
      }

    });
  };

  showSuccessModal(result) {
    Modal.success({
      title: '执行成功',
      content: result,
    });
  }

  showErrorModal(result) {
    Modal.error({
      title: '执行失败',
      content: result,
    });
  }

  setCallable = () => {
    let callableName = this.props.match.params.name;
    var callableInfo
    for (callableInfo of this.props.callables) {
      if (callableInfo.callable_name === callableName) {
        this.callable = callableInfo
        break
      }
    }
  };

  buildFormItem = (parameter, index, array) => {
    const { getFieldDecorator } = this.props.form;

    let parameterName = parameter.name
    let inputWidget
    switch (parameter.annotation) {
      case 'str':
        inputWidget = <Input allowClear />;
        break
      case 'float':
        inputWidget = <InputNumber allowClear />;
        break
      case 'int':
        inputWidget = <InputNumber parser={value => Math.floor(value)} allowClear />;
        break
      case 'bool':
        inputWidget = <Radio.Group buttonStyle="solid">
          <Radio.Button value={true}>True</Radio.Button>
          <Radio.Button value={false}>False</Radio.Button>
        </Radio.Group>;
        break
      case 'datetime':
        inputWidget = <DatePicker showTime />;
        break
      case 'date':
        inputWidget = <DatePicker />;
        break
      case 'time':
        inputWidget = <TimePicker />;
        break
      case 'Enum':
        inputWidget = <Radio.Group buttonStyle="solid">
          {
            parameter.enum_values.map((value, index, array) =>
              <Radio.Button value={value} key={index}>{value}</Radio.Button>
            )
          }
        </Radio.Group>;
        break
      default:
        inputWidget = <Input />;
    }

    return <Form.Item label={parameterName} key={index}>
      {getFieldDecorator(parameterName, {
        initialValue: this.buildDefaultValue(parameter),
        rules: [{ required: parameter['required'], message: `请输入${parameterName}!` }],
      })(inputWidget)}
    </Form.Item>
  }

  buildDefaultValue = parameter => {
    if (parameter.annotation === 'time' && parameter.default) {
      return moment(parameter.default, 'HH:mm:ss')
    }
    else if (parameter.annotation === 'date' && parameter.default) {
      return moment(parameter.default, '"YYYY-MM-DD"')
    }
    else if (parameter.annotation === 'datetime' && parameter.default) {
      return moment(parameter.default, '"YYYY-MM-DDTHH:mm:ss"')
    }
    else {
      return parameter.default
    }
  }

  render() {
    this.setCallable()

    return (
      <PageHeader
        style={{
          border: '1px solid rgb(235, 237, 240)',
        }}
        onBack={() => this.props.history.push('/')}
        title="功能列表"
      >
        <Form layout="vertical" onSubmit={this.handleSubmit}>
          <Divider>{this.callable ? this.callable.callable_name : ''}</Divider>
          <pre>{this.callable && this.callable.doc ? this.callable.doc : '没有文档'}</pre>
          {
            this.callable && this.callable.parameters.length ? <Divider>参数填写</Divider> : []
          }

          {
            this.callable ? this.callable.parameters.map(this.buildFormItem) : []
          }
          <Form.Item wrapperCol={{ span: 24}}>
            <Button type="primary" htmlType="submit" block>
              运行
            </Button>
          </Form.Item>
        </Form>
      </PageHeader>
    );
  }
}

const WrappedCallableForm = Form.create({ name: 'callablForm' })(CallableForm);

const mapStateToFormProps = state => {
  return {
    callables: state.callables
  }
}

const ReduxWrappedCallableForm = connect(mapStateToFormProps, mapDispatchToProps)(WrappedCallableForm)


class LanguageSelector extends Component {

  getLocaleText = locale => {
    if (locale === enUS) {
      return 'English'
    } else if (locale === zhCN){
      return '中文'
    }
  }

  state = {
    localeText: this.getLocaleText(this.props.locale)
  }

  componentDidMount() {
    const { setLocale, locale } = this.props

    axios.get('locale')
      .then(response => {
        if (response.data.locale === locale.locale) {
          return
        }

        if (response.data.locale === 'en') {
          setLocale(enUS)
        } else {
          setLocale(zhCN)
        }
      });

  }

  onChangeLocale = e => {
    const { setLocale, locale } = this.props
    
    let newLocale = null
    if (locale === enUS) {
      newLocale = zhCN
    } else if (locale === zhCN) {
      newLocale = enUS
    }

    axios.post('locale', { locale: newLocale.locale })

    setLocale(newLocale);
    this.setState({localeText: this.getLocaleText(newLocale)})

    if (newLocale === enUS) {
      moment.locale('en');
    } else {
      moment.locale('zh-cn');
    }
  };

  render() {
    return (
      <Button onClick={this.onChangeLocale}>
        {this.state.localeText}
      </Button>
    )
  }
}


const mapStateLocaleToProps = state => {
  return {
    locale: state.locale
  }
}


const mapDispatchLocaleToProps = dispatch => {
  return bindActionCreators({
    setLocale: setLocale
  }, dispatch)
}


const ReduxLanguageSelector = connect(mapStateLocaleToProps, mapDispatchLocaleToProps)(LanguageSelector)


class ModuleReloader extends Component {

  state = {
    loading: false,
  }

  reloadModule = e => {
    const { updateCallables } = this.props
    this.setState({loading: true})
    axios.post('reload-module')

    axios.get('callable')
      .then(response => {
        updateCallables(response.data)
      });
    this.setState({loading: false})
    window.location.reload(true)
    message.success('更新成功', 1);
  }

  queryNewModule = () => {
    const { hasNewModule, changeModuleStatus } = this.props;

    axios.get('module-status')
      .then(response => {
        if (response.data.has_new === hasNewModule) {
          return
        }
        if (response.data.has_new) {
          message.info('模块有更新！', 1);
        }
        changeModuleStatus(response.data.has_new)
      });
  }

  tick() {
    this.setState((prevState) => ({
      secondsElapsed: prevState.secondsElapsed + 1
    }));
  }

  componentDidMount() {
    this.interval = setInterval(() => this.queryNewModule(), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return (
      <Button
        disabled={!this.props.hasNewModule}
        loading={this.state.loading}
        style={{ display: 'inline-block' }}
        onClick={this.reloadModule}
      >
      Reload Module
      </Button>
    )
  }
}


const mapModuleStateToProps = state => {
  return {
    hasNewModule: state.hasNewModule
  }
}


const mapchangeModuleStatusToProps = dispatch => {
  return bindActionCreators({
    changeModuleStatus: changeModuleStatus,
    updateCallables: updateCallables
  }, dispatch)
}


const ReduxModuleReloader = connect(mapModuleStateToProps, mapchangeModuleStatusToProps)(ModuleReloader)


class App extends Component {

  componentDidMount() {
    document.title = "Touch-Callable"
  }

  render() {
    const { locale } = this.props;
    return (
      <ConfigProvider locale={locale}>
        <Layout className="layout" style={{ minHeight: '10000px' }} key={locale ? locale.locale : 'en' /* Have to refresh for production environment */}>
          <Header>
            <Row>
              <Col span={8}><p style={{ color: 'white', display: 'inline-block' }}>Touch Callable</p></Col>
              <Col span={8} push={5}><ReduxModuleReloader /></Col>
              <Col span={8}><ReduxLanguageSelector /></Col>
            </Row>
          </Header>
          <Content style={{ margin: '0 auto', width: '700px' }}>
            <HashRouter>
              <Switch>
                <Route exact path='/' component={ReduxCallables} />
                <Route path='/callable/:name' component={ReduxWrappedCallableForm} />
              </Switch>
            </HashRouter>
          </Content>
          <Footer style={{ textAlign: 'center' }}>Touch Callable</Footer>
        </Layout>
      </ConfigProvider >
    )
  }
}

const ReduxApp = connect(mapStateLocaleToProps)(App)

export default ReduxApp;
