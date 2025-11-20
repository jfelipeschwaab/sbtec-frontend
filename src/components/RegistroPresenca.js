import React, { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';

import { Checkbox } from 'react-native-paper';
// ModalSelector removido pois a turma já vem selecionada da tela anterior
// Se precisar mudar de turma, o ideal é voltar para a tela de filtros.
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';

// AJUSTE AQUI SEU IP LOCAL PARA TESTES
const API_URL = 'http://localhost:3000'; // Exemplo: http://192.168.0.15:3000

const RegistroPresenca = () => {
  const route = useRoute();
  const navigation = useNavigation();

  // Recebe os parâmetros vindos da tela InterfaceDocente
  const { idAlocacao, turma, disciplina, etapa, anoEscolar } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState([]);
  // Estado para controlar as presenças individualmente pelo ID do aluno
  const [presencas, setPresencas] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const dataAtual = new Date().toLocaleDateString('pt-BR');

  // --- BUSCAR ALUNOS DA API ---
  useEffect(() => {
    if (!idAlocacao) {
      Alert.alert("Erro", "Alocação não informada. Volte e selecione novamente.");
      navigation.goBack();
      return;
    }

    const fetchAlunos = async () => {
      try {
        setLoading(true);
        // Chama o endpoint correto: /turmas/:id/alunos
        const response = await fetch(`${API_URL}/turmas/${idAlocacao}/alunos`);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        setAlunos(data.alunos || []);

        // Inicializa todas as presenças como 'false' (ou 'true' se preferir começar com todos presentes)
        const presencasIniciais = {};
        (data.alunos || []).forEach(aluno => {
            presencasIniciais[aluno.id_aluno] = false;
        });
        setPresencas(presencasIniciais);

      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar a lista de alunos.");
        console.error("Erro ao buscar alunos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlunos();
  }, [idAlocacao]);

  // --- FILTRO DE BUSCA ---
  const filteredAlunos = useMemo(() => {
    return alunos.filter((aluno) =>
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [alunos, searchTerm]);

  // --- HANDLERS ---
  const handleCheckboxChange = (idAluno) => {
    setPresencas(prev => ({
      ...prev,
      [idAluno]: !prev[idAluno] // Inverte o valor atual
    }));
  };

  const handleSave = async () => {
    // Prepara o objeto exatamente como o backend espera
    const dadosParaEnviar = {
        id_alocacao: idAlocacao,
        data: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        etapa: etapa,
        presencas: Object.entries(presencas).map(([id_aluno, presente]) => ({
            id_aluno: parseInt(id_aluno),
            presente: presente
        }))
    };

    try {
      const response = await fetch(`${API_URL}/turmas/registrar-presenca`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaEnviar),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Chamada realizada e salva no servidor!');
        navigation.goBack(); // Volta para a tela anterior após salvar
      } else {
        Alert.alert('Erro', 'Houve um erro ao salvar no servidor.');
      }
    } catch (error) {
      console.error("Erro de requisição:", error);
      Alert.alert('Erro', 'Falha na conexão com o backend.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1A128F" />
        <Text style={{ marginTop: 20 }}>Carregando alunos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <View style={styles.header}>
        <LinearGradient
          colors={['#080529', '#1A128F']}
          style={styles.gradientHeader}
        >
          <Text style={styles.title}>Registro de Presença</Text>
           {/* Subtítulo opcional para mostrar contexto */}
          <Text style={{color: '#F9DC5C', fontSize: 14, marginTop: 5}}>
             {turma} - {disciplina} ({etapa})
          </Text>
        </LinearGradient>
      </View>

      <View style={styles.selectContainer}>
        {/* Exibe a Turma fixa vinda da tela anterior */}
        <Text style={styles.selectedText}>Turma:</Text>
        <TextInput
            style={[styles.input, styles.flex1, { backgroundColor: '#e0e0e0', color: '#555' }]} // Estilo visual de desabilitado
            value={turma}
            editable={false}
        />

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{dataAtual}</Text>
        </View>
      </View>

      {/* Barra de Pesquisa */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={24} color="gray" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar aluno..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderText}>Matrícula</Text>
        {/* Removi a coluna 'Turma' pois já é sabido que todos são da mesma turma nesta tela,
            mas se quiser manter, pode descomentar abaixo e ajustar os flex no styles */}
        {/* <Text style={styles.tableHeaderText}>Turma</Text> */}
        <Text style={[styles.tableHeaderText, { flex: 2 }]}>Nome</Text>
        <Text style={[styles.tableHeaderText, { textAlign: 'center', flex: 0.5 }]}>Presença</Text>
      </View>

      <FlatList
        data={filteredAlunos}
        keyExtractor={(item) => item.id_aluno.toString()}
        renderItem={({ item, index }) => (
          <View
            style={[styles.listItem, {
              backgroundColor: index % 2 === 0 ? '#D3D3D3' : '#FFFFFF',
            }]}
          >
            <Text style={styles.listTextMatricula}>{item.matricula}</Text>
            {/* <Text style={styles.listTextTurma}>{turma}</Text> */}
            <Text style={styles.listTextNome}>{item.nome}</Text>

            <View style={styles.checkboxContainer}>
              <Checkbox
                status={presencas[item.id_aluno] ? 'checked' : 'unchecked'}
                onPress={() => handleCheckboxChange(item.id_aluno)}
                color={'#1A128F'} // Usando a cor do tema
                uncheckedColor={'gray'}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: 'gray' }}>
                Nenhum aluno encontrado para esta turma.
            </Text>
        }
      />

      <TouchableOpacity style={styles.saveButtonContainer} onPress={handleSave}>
        <LinearGradient
          colors={['#080529', '#1A128F']}
          style={styles.saveButton}
        >
          <Text style={styles.saveButtonText}>Salvar Lista</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30, // Reduzi um pouco
  },
  gradientHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffff',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  selectedText: {
    fontSize: 16,
    marginRight: 10,
    color: '#333',
    fontWeight: 'bold'
  },
  flex1: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10, // Reduzi levemente
    borderRadius: 6,
    // width: '100%', // Removido pois está num flex row
    backgroundColor: '#f9f9f9',
    fontSize: 16,
    color: '#333',
    textAlign: 'left',
    marginRight: 10, // Espaço para a data
  },
  dateContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#333'
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 10,
    width: '100%', // Aumentei para 100% para ficar mais usável no mobile
    alignSelf: 'center',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10, // Melhor controle de altura
    fontSize: 16
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Centraliza verticalmente os textos do header
    backgroundColor: '#1C138D',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'left',
    color: 'white',
    fontSize: 15,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Garante distribuição
    alignItems: 'center',
    paddingVertical: 12, // Reduzi levemente para caber mais alunos
    paddingHorizontal: 5,
    marginBottom: 5, // Espaçamento menor entre linhas
    borderRadius: 5,
  },
  listTextMatricula: {
    flex: 1,
    textAlign: 'left',
    fontSize: 15,
    paddingLeft: 5,
  },
  // listTextTurma: { ... }, // Removido se não for usar a coluna Turma
  listTextNome: {
    flex: 2, // Mais espaço para o nome
    textAlign: 'left',
    fontSize: 15,
    paddingLeft: 5,
  },
  checkboxContainer: {
    flex: 0.5, // Espaço fixo para o checkbox
    alignItems: 'center',
    justifyContent: 'center',
    // borderWidth: 1, // Opcional: visualizar a área do checkbox
    // borderColor: 'red'
  },
  saveButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20, // Margem inferior para não colar na borda da tela
  },
  saveButton: {
    width: '60%', // Um pouco mais largo
    paddingVertical: 15,
    borderRadius: 25, // Mais arredondado fica mais moderno
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3, // Sombra no Android
    shadowColor: '#000', // Sombra no iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RegistroPresenca;