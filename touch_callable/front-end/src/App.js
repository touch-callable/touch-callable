import React, { Component } from 'react';
import { HashRouter, Route, Link, Switch } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { List, Form, Input, Button, message, DatePicker, Upload, Icon, TimePicker, Modal, Layout, Radio, Divider, PageHeader, InputNumber, ConfigProvider, Row, Col } from 'antd';
import enUS from 'antd/es/locale/en_US';
import zhCN from 'antd/es/locale/zh_CN';
import axios from 'axios';
import moment, { locales } from 'moment';
import { injectIntl, FormattedMessage, IntlProvider } from 'react-intl';
import 'moment/locale/zh-cn';
import './App.css';

import { ReactComponent as Logo } from './logo.svg';
import { ReactComponent as LogoText } from './touch-callable-text.svg'

import { updateCallables, setLocale, changeModuleStatus } from './reducers'

import en_US from './locales/en_US'
import zh_CN from './locales/zh_CN'


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

const ReduxCallables = connect(mapStateToProps, mapDispatchToProps)(injectIntl(Callables))


class SingleFileUpload extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fileList: [],
      disabled: false
    };
  }

  handleChange = info => {
    let fileList = [...info.fileList];

    if (fileList.length >= 1) {
      this.setState({
        disabled: true
      })
    }

    this.setState({ fileList });
    this.props.onChange(fileList)
  };

  onRemove = e => {
    this.setState({ disabled: false })
    return true
  };

  render() {
    const { disabled } = this.state;
    const props = {
      onChange: this.handleChange,
      onRemove: this.onRemove
    };

    return (
      <Upload {...props} beforeUpload={file => { return false }} fileList={this.state.fileList}>
        {this.state.fileList.length === 0 ? (
          <Button disabled={disabled} >
            <Icon type="upload" /> <FormattedMessage id="upload" />
          </Button>) : null
        }
      </Upload>
    );
  }
}


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
        let files = {}
        let json = {}
        for (var paramName of Object.keys(values)) {
          let value = values[paramName]
          if (Array.isArray(value) && value.length !== 0 && value[0] instanceof Object && value[0].originFileObj instanceof File) {
            files[paramName] = values[paramName][0].originFileObj
          } else {
            json[paramName] = values[paramName]
          }
        }

        if (Object.keys(files).length === 0) {
          axios.post(`callable/${this.props.match.params.name}`, values)
            .then((response) => {
              if (response.data.status === 'success') {
                this.showSuccessModal(response.data.result)
              } else {
                this.showErrorModal(response.data.result)
              }
            });
        } else {
          let formDataWithFile = new FormData()
          formDataWithFile.set('json', JSON.stringify(json))
          for (var paramName of Object.keys(files)) {
            formDataWithFile.append(paramName, files[paramName])
          }
          axios({
            method: 'post',
            url: `callable/${this.props.match.params.name}`,
            data: formDataWithFile,
            headers: { 'Content-Type': 'multipart/form-data' }
          })
            .then((response) => {
              if (response.data.status === 'success') {
                this.showSuccessModal(response.data.result)
              } else {
                this.showErrorModal(response.data.result)
              }
            });
        }
      }

    });
  };

  showSuccessModal(result) {
    Modal.success({
      title: this.props.intl.formatMessage({id: "executionSucceed"}),
      content: result,
    });
  }

  showErrorModal(result) {
    Modal.error({
      title: this.props.intl.formatMessage({id: "executionFailed"}),
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

  normFile = e => {
    if (Array.isArray(e)) {
      return e;
    }
    return e && e.fileList;
  };

  buildFormItem = (parameter, index, array) => {
    const { getFieldDecorator } = this.props.form;

    let parameterName = parameter.name

    if (["BytesIO", "BinaryIO"].includes(parameter.annotation)) {
      return <Form.Item label={parameterName} key={index}>
        {getFieldDecorator(parameterName, {
          valuePropName: 'fileList',
          getValueFromEvent: this.normFile,
          rules: [{ required: parameter['required'], message: <FormattedMessage id='pleaseUploadFile' /> }],
        })(<SingleFileUpload ></SingleFileUpload>)}
      </Form.Item>
    }

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
        rules: [{ required: parameter['required'], message: this.props.intl.formatMessage({id: "pleaseInput"}, { parameterName: parameterName }) }],
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
        title={this.props.intl.formatMessage({id: "callables"})}
      >
        <Form layout="vertical" onSubmit={this.handleSubmit}>
          <Divider>{this.callable ? this.callable.callable_name : ''}</Divider>
          <pre>{this.callable && this.callable.doc ? this.callable.doc : <FormattedMessage id="noDoc" />}</pre>
          {
            this.callable && this.callable.parameters.length ? <Divider><FormattedMessage id="parameterList" /></Divider> : []
          }

          {
            this.callable ? this.callable.parameters.map(this.buildFormItem) : []
          }

          <Form.Item wrapperCol={{ span: 24 }}>
            <Button type="primary" htmlType="submit" block>
              <FormattedMessage id="touch" />
            </Button>
          </Form.Item>
        </Form>
      </PageHeader>
    );
  }
}

const WrappedCallableForm = Form.create({ name: 'callablForm' })(injectIntl(CallableForm));

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
    } else if (locale === zhCN) {
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
    this.setState({ localeText: this.getLocaleText(newLocale) })

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
    this.setState({ loading: true })
    axios.post('reload-module')

    axios.get('callable')
      .then(response => {
        updateCallables(response.data)
      });
    this.setState({ loading: false })
    window.location.reload(true)
    message.success(this.props.intl.formatMessage({id: "updateCompleted"}), 1);
  }

  queryNewModule = () => {
    const { hasNewModule, changeModuleStatus } = this.props;

    axios.get('module-status')
      .then(response => {
        if (response.data.has_new === hasNewModule) {
          return
        }
        if (response.data.has_new) {
          message.info(this.props.intl.formatMessage({id: "moduleChanged"}), 1);
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
        style={{ display: 'inline-block', marginRight: '20px' }}
        onClick={this.reloadModule}
      >
        <FormattedMessage id="reloadModule" />
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


const ReduxModuleReloader = connect(mapModuleStateToProps, mapchangeModuleStatusToProps)(injectIntl(ModuleReloader))


class App extends Component {

  componentDidMount() {
    document.title = "Touch-Callable"
  }

  render() {
    const { locale } = this.props;

    return (
      <ConfigProvider locale={locale}>
        <IntlProvider key={locale} locale={locale.locale} messages={locale.locale === 'en' ? en_US : zh_CN}>
          <Layout className="layout" key={locale ? locale.locale : 'en' /* Have to refresh for production environment */}>
            <Header style={{ background: 'white', boxShadow: '0px 1px 5px #d0cdcd', height: 'unset' }}>
              <Row type="flex" justify="center" align="middle">
                <Col md={8} xs={24}>
                  <Logo style={{ verticalAlign: 'middle', marginRight: '20px', width: '48px', height: '48px' }} />
                  <LogoText style={{ verticalAlign: 'middle', width: '150px' }} />
                </Col>
                <Col md={8} xs={24}></Col>
                <Col md={8} xs={24} style={{ textAlign: "right" }}>
                  <ReduxModuleReloader style={{ marginRight: '20px' }} />
                  <ReduxLanguageSelector />
                </Col>
              </Row>
            </Header>
            <Content style={{ margin: '10px 10px' }}>
              <Row span={24}>
                <Col md={6} xs={24}></Col>
                <Col md={12} xs={24}>
                  <HashRouter>
                    <Switch>
                      <Route exact path='/' component={ReduxCallables} />
                      <Route path='/callable/:name' component={ReduxWrappedCallableForm} />
                    </Switch>
                  </HashRouter>
                </Col>
                <Col md={6} xs={24}></Col>
              </Row>
            </Content>
            <Footer style={{ textAlign: 'center' }}>Touch Callable</Footer>
          </Layout>
        </IntlProvider>
      </ConfigProvider >
    )
  }
}

const ReduxApp = connect(mapStateLocaleToProps)(App)

export default ReduxApp;
